// Get the API URL from environment variables, or use default localhost
// This allows us to change the backend URL for production without changing code
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ApiClient class: Handles all communication with the backend server
// This is like a helper that makes it easy to talk to the API
class ApiClient {
  // Store the authentication token (like a password that proves who you are)
  private token: string | null = null;

  // Save the login token so we stay logged in even after refreshing the page
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      // Save to browser's local storage (persists even after closing browser)
      localStorage.setItem('auth_token', token);
    } else {
      // Remove token when logging out
      localStorage.removeItem('auth_token');
    }
  }

  // Get the saved token from memory or local storage
  getToken(): string | null {
    if (!this.token) {
      // Try to load from browser's local storage
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  // Private helper method: Makes HTTP requests to the backend
  // This is the core function that all other methods use
  private async request<T>(
    endpoint: string,        // The API path (e.g., '/auth/admin/login')
    options: RequestInit = {} // Request options (method, body, etc.)
  ): Promise<T> {
    // Get the authentication token
    const token = this.getToken();
    
    // Set up request headers (metadata about the request)
    const headers: HeadersInit = {
      'Content-Type': 'application/json',  // Tell server we're sending JSON data
      ...options.headers,                   // Include any custom headers
    };

    // If we have a token, add it to the request
    // The backend uses this to know who is making the request
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Make the HTTP request to the backend server
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,  // Include method, body, etc.
      headers,     // Include our headers
    });

    // Check if the request was successful
    if (!response.ok) {
      // If error, try to get error message from response
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    // Convert response to JavaScript object and return it
    return response.json();
  }

  // ============================================
  // AUTHENTICATION ENDPOINTS
  // ============================================
  
  // Logs in an admin user with email and password
  // Returns a token that proves the user is logged in
  async adminLogin(email: string, password: string) {
    const data = await this.request<{ token: string; admin: any }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }), // Send email and password to backend
    });
    // Save the token so we stay logged in
    this.setToken(data.token);
    return data;
  }

  // Logs in a regular user (family member) with just their email
  // Users don't need passwords - they just need to know their email
  async userLogin(email: string) {
    const data = await this.request<{ token: string; person: any }>('/auth/user/login', {
      method: 'POST',
      body: JSON.stringify({ email }), // Only send email (no password needed)
    });
    // Save the token so we stay logged in
    this.setToken(data.token);
    return data;
  }

  // ============================================
  // FAMILY ENDPOINTS
  // ============================================
  
  // Creates a new family with an admin account
  // This is the first step when setting up a new family
  async createFamily(name: string, adminEmail: string, adminPassword: string) {
    const data = await this.request<{ token: string; family: any }>('/families', {
      method: 'POST',
      body: JSON.stringify({ name, adminEmail, adminPassword }),
    });
    // Automatically log in as the admin after creating the family
    this.setToken(data.token);
    return data;
  }

  // Gets all data for a family (people, chores, assignments, etc.)
  async getFamily(familyId: string) {
    return this.request<any>(`/families/${familyId}`);
  }

  // Adds a new admin user to an existing family
  // Only existing admins can do this
  async addAdmin(familyId: string, email: string, password: string) {
    return this.request<any>(`/families/${familyId}/admins`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Removes an admin from a family
  // Can't remove the last admin (family must have at least one)
  async removeAdmin(familyId: string, adminId: string) {
    return this.request(`/families/${familyId}/admins/${adminId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // PEOPLE ENDPOINTS
  // ============================================
  
  // Gets all people (family members) for a family
  async getPeople(familyId: string) {
    return this.request<any[]>(`/people/family/${familyId}`);
  }

  // Adds a new person (family member) to a family
  // phone is optional (the ? means it might not be provided)
  async addPerson(familyId: string, name: string, email: string, phone?: string) {
    return this.request<any>(`/people/family/${familyId}`, {
      method: 'POST',
      body: JSON.stringify({ name, email, phone }),
    });
  }

  // Updates an existing person's information
  // Can change name, email, phone, or color
  async updatePerson(personId: string, name: string, email: string, phone?: string, color?: string) {
    return this.request<any>(`/people/${personId}`, {
      method: 'PUT', // PUT is used for updating existing data
      body: JSON.stringify({ name, email, phone, color }),
    });
  }

  // Deletes a person from a family
  // This also deletes all their chore assignments
  async deletePerson(personId: string) {
    return this.request(`/people/${personId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // CHORE ENDPOINTS
  // ============================================
  
  // Gets all chores for a family
  async getChores(familyId: string) {
    return this.request<any[]>(`/chores/family/${familyId}`);
  }

  // Adds a new chore to a family
  // label is the name of the chore (e.g., "Take out trash")
  async addChore(familyId: string, label: string) {
    return this.request<any>(`/chores/family/${familyId}`, {
      method: 'POST',
      body: JSON.stringify({ label }),
    });
  }

  // Updates an existing chore's name
  async updateChore(choreId: string, label: string) {
    return this.request<any>(`/chores/${choreId}`, {
      method: 'PUT',
      body: JSON.stringify({ label }),
    });
  }

  // Deletes a chore from a family
  // This also deletes all assignments of this chore
  async deleteChore(choreId: string) {
    return this.request(`/chores/${choreId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // ASSIGNMENT ENDPOINTS
  // ============================================
  
  // Gets all chore assignments for a specific week
  // weekStartISO is the date of the Sunday that starts the week (format: "2026-02-16")
  async getAssignments(familyId: string, weekStartISO: string) {
    return this.request<any[]>(`/assignments/family/${familyId}/week/${weekStartISO}`);
  }

  // Assigns a chore to a person on a specific day
  // dayIndex: 0=Sunday, 1=Monday, 2=Tuesday, etc.
  async addAssignment(familyId: string, personId: string, choreId: string, weekStartISO: string, dayIndex: number) {
    return this.request<any>(`/assignments/family/${familyId}`, {
      method: 'POST',
      body: JSON.stringify({ personId, choreId, weekStartISO, dayIndex }),
    });
  }

  // Assigns a chore to a person for the entire week (all 7 days)
  // This is a shortcut - instead of assigning day by day
  async addWeekAssignment(familyId: string, personId: string, choreId: string, weekStartISO: string) {
    return this.request<any[]>(`/assignments/family/${familyId}/week`, {
      method: 'POST',
      body: JSON.stringify({ personId, choreId, weekStartISO }),
    });
  }

  // Removes a chore assignment (unassigns a chore from a person on a specific day)
  async deleteAssignment(assignmentId: string) {
    return this.request(`/assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
