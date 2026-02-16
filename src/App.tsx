// Import React hooks and our API client
// useState: Stores data that can change (like form inputs, current user)
// useEffect: Runs code when something changes (like loading data when user logs in)
// useMemo: Calculates values that are expensive to compute
import React, { useMemo, useState, useEffect } from 'react';
import { apiClient } from './api/client';

// Constants - values that never change
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// Helper function: Formats a date to look nice (e.g., "Feb 16")
const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Helper function: Formats a date to show month and year (e.g., "February 2026")
const formatMonthYear = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

// Helper function: Gets the start of the week (Sunday) for any given date
// This is used to group assignments by week
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0 (Sun) - 6 (Sat)
  // Go back to the start of the week (Sunday)
  d.setDate(d.getDate() - dayOfWeek);
  // Set time to midnight (start of day)
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper function: Converts a date to ISO format string (e.g., "2026-02-16")
// This format is used to store dates in the database
const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0'); // Add leading zero if needed
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Type definitions - these describe what shape our data has
// TypeScript uses these to catch errors before the code runs

// ViewMode: Can be either 'weekly' (show one week) or 'monthly' (show whole month)
type ViewMode = 'weekly' | 'monthly';

// ConfigTab: Which settings tab is open (people, chores, or admins)
type ConfigTab = 'people' | 'chores' | 'admins';

// LoginTab: Which login form to show
type LoginTab = 'createFamily' | 'adminLogin' | 'userLogin';

// Admin: Represents an admin user who can manage a family
interface Admin {
  id: string;        // Unique identifier
  email: string;     // Email address (used for login)
  password: string;  // Password (not used in frontend, only for display)
}

// Family: Represents a family group with all its data
interface Family {
  id: string;                    // Unique identifier
  name: string;                   // Family name (e.g., "Smith Family")
  admins: Admin[];                // List of admin users
  people: Person[];               // List of family members
  chores: Chore[];                // List of chores
  assignments: Assignment[];      // List of chore assignments
}

// Person: Represents a family member
interface Person {
  id: string;        // Unique identifier
  name: string;      // Person's name
  email: string;     // Email address
  phone?: string;    // Optional phone number (? means it might not exist)
  color: string;     // Color used to display this person's chores
}

// Chore: Represents a chore that can be assigned
interface Chore {
  id: string;        // Unique identifier
  label: string;     // Name of the chore (e.g., "Take out trash")
}

// Assignment: Links a person to a chore on a specific day
// This is the core data - it says "John does Dishes on Monday"
interface Assignment {
  id: string;              // Unique identifier
  person_id: string;       // Which person is assigned
  chore_id: string;        // Which chore they're assigned
  week_start_iso: string;  // Which week (format: "2026-02-16")
  day_index: number;       // Which day (0=Sunday, 1=Monday, etc.)
  family_id?: string;      // Optional: which family this belongs to
}

const defaultChores: Chore[] = [
  { id: 'dishes', label: 'Dishes' },
  { id: 'trash', label: 'Trash' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'vacuum', label: 'Vacuum' }
];

// Main App component - this is the root of our React application
// Everything starts here!
export const App: React.FC = () => {
  // State variables - these store data that can change
  // useState creates a variable and a function to update it
  // When state changes, React automatically re-renders the component
  
  // Current family data loaded from the backend
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  // ID of the currently selected family
  const [currentFamilyId, setCurrentFamilyId] = useState<string | null>(null);
  // ID of the currently logged-in admin (null if not logged in)
  const [loggedInAdminId, setLoggedInAdminId] = useState<string | null>(null);
  // Whether we're currently loading data from the backend
  const [loading, setLoading] = useState(false);
  // Any error message to display
  const [error, setError] = useState<string | null>(null);
  
  // Form input values for login
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  // Which login tab is currently shown
  const [loginTab, setLoginTab] = useState<LoginTab>('createFamily');
  
  // ID of the person currently viewing their chores (null if admin view)
  const [viewingPersonId, setViewingPersonId] = useState<string | null>(null);
  
  // Form input values for adding new people
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  
  // Form input values for adding new chores
  const [newChoreLabel, setNewChoreLabel] = useState('');
  
  // Form input values for creating a family
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  
  // UI state - which view and tab to show
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');  // 'weekly' or 'monthly'
  const [configTab, setConfigTab] = useState<ConfigTab>('people'); // 'people', 'chores', or 'admins'
  
  // Editing state - which item is currently being edited
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonName, setEditingPersonName] = useState('');
  const [editingPersonEmail, setEditingPersonEmail] = useState('');
  const [editingPersonPhone, setEditingPersonPhone] = useState('');
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [editingChoreLabel, setEditingChoreLabel] = useState('');

  // Helper function: Assigns a color to each person based on their position
  // This cycles through a palette of colors
  const getDefaultColorForIndex = (index: number): string => {
    const palette = ['#f97373', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#a855f7'];
    return palette[index % palette.length]; // Use modulo to cycle through colors
  };
  
  // Current week being displayed (starts at the beginning of the current week)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  // Current month being displayed (starts at the 1st of the current month)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // useEffect: Runs code when something changes
  // This one loads family data whenever currentFamilyId changes
  useEffect(() => {
    const loadFamily = async () => {
      // If no family ID, clear the family data
      if (!currentFamilyId) {
        setCurrentFamily(null);
        return;
      }

      // Show loading spinner
      setLoading(true);
      setError(null);
      try {
        // Ask the backend for the family data
        const family = await apiClient.getFamily(currentFamilyId);
        // Save the family data to state
        setCurrentFamily(family);
      } catch (err: any) {
        // If something went wrong, show an error message
        setError(err.message || 'Failed to load family data');
        console.error('Error loading family:', err);
      } finally {
        // Always hide loading spinner, even if there was an error
        setLoading(false);
      }
    };

    loadFamily();
  }, [currentFamilyId]); // Run this whenever currentFamilyId changes

  // Load assignments for the current week whenever the week changes
  useEffect(() => {
    const loadAssignments = async () => {
      // Don't load if we don't have a family ID or family data yet
      if (!currentFamilyId || !currentFamily) return;

      try {
        // Get assignments for this specific week from the backend
        const weekAssignments = await apiClient.getAssignments(currentFamilyId, currentWeekKey);
        // Update the family data with the new assignments
        setCurrentFamily((prev) => prev ? { ...prev, assignments: weekAssignments } : null);
      } catch (err: any) {
        console.error('Error loading assignments:', err);
      }
    };

    loadAssignments();
  }, [currentFamilyId, currentWeekKey]); // Run when family ID or week changes

  // Get data from current family, or use empty arrays if no family loaded
  // The ?. is called "optional chaining" - safely accesses properties that might not exist
  const people = currentFamily?.people || [];
  const chores = currentFamily?.chores || [];
  const assignments = currentFamily?.assignments || [];

  // Create a map (object) of chores by ID for quick lookup
  // This makes it faster to find a chore by its ID instead of searching through an array
  const choresMap = useMemo(
    () => Object.fromEntries(chores.map((c) => [c.id, c])),
    [chores] // Only recalculate when chores change
  );

  // Convert the current week start date to ISO format string (e.g., "2026-02-16")
  // This is used as a key to identify which week we're looking at
  const currentWeekKey = useMemo(() => toISODate(currentWeekStart), [currentWeekStart]);

  // Calculate all the dates in the current week
  // This creates an array of 7 Date objects, one for each day of the week
  const { weekStart, weekEnd, weekDates } = useMemo(() => {
    const start = currentWeekStart;

    // Create an array with 7 dates, starting from Sunday
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i); // Add i days to get each day of the week
      return d;
    });

    // Calculate the end date (6 days after start = Saturday)
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return { weekStart: start, weekEnd: end, weekDates: dates };
  }, [currentWeekStart]); // Only recalculate when currentWeekStart changes

  const monthMatrix = useMemo(() => {
    const firstOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const start = getWeekStart(firstOfMonth);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const weeks: Date[][] = [];
    let current = new Date(start);

    // Build weeks until we've covered the entire month
    // (including leading/trailing days from adjacent months)
    while (true) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);

      if (week[6] >= endOfMonth) {
        break;
      }
    }

    return weeks;
  }, [currentMonth]);

  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      return d;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      d.setHours(0, 0, 0, 0);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      return d;
    });
  };

  const goToThisWeek = () => {
    const today = new Date();
    const start = getWeekStart(today);
    setCurrentWeekStart(start);
    setCurrentMonth(new Date(start.getFullYear(), start.getMonth(), 1));
  };

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToThisMonth = () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setCurrentMonth(thisMonth);
    const start = getWeekStart(now);
    setCurrentWeekStart(start);
  };

  // Handler function: Adds a new chore to the family
  // This is called when the user clicks "Add" after typing a chore name
  const handleAddChore = async () => {
    // Don't do anything if we don't have a family ID
    if (!currentFamilyId) return;
    // Remove extra spaces from the beginning and end
    const trimmed = newChoreLabel.trim();
    // Don't add empty chores
    if (!trimmed) return;

    try {
      // Send request to backend to create the chore
      const chore = await apiClient.addChore(currentFamilyId, trimmed);
      // Add the new chore to our local state (so it appears immediately)
      setCurrentFamily((prev) => prev ? { ...prev, chores: [...prev.chores, chore] } : null);
      // Clear the input field
      setNewChoreLabel('');
    } catch (err: any) {
      // If something went wrong, show an error message
      alert(err.message || 'Failed to add chore');
    }
  };

  const handleRemoveChore = async (choreId: string) => {
    try {
      await apiClient.deleteChore(choreId);
      setCurrentFamily((prev) => prev ? {
        ...prev,
        chores: prev.chores.filter((c) => c.id !== choreId),
        assignments: prev.assignments.filter((a) => a.choreId !== choreId)
      } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove chore');
    }
  };

  const handleStartEditChore = (chore: Chore) => {
    setEditingChoreId(chore.id);
    setEditingChoreLabel(chore.label);
  };

  const handleSaveEditChore = async () => {
    const trimmed = editingChoreLabel.trim();
    if (!editingChoreId || !trimmed) {
      setEditingChoreId(null);
      setEditingChoreLabel('');
      return;
    }

    try {
      const updated = await apiClient.updateChore(editingChoreId, trimmed);
      setCurrentFamily((prev) => prev ? {
        ...prev,
        chores: prev.chores.map((c) => (c.id === editingChoreId ? updated : c))
      } : null);
      setEditingChoreId(null);
      setEditingChoreLabel('');
    } catch (err: any) {
      alert(err.message || 'Failed to update chore');
    }
  };

  const handleCancelEditChore = () => {
    setEditingChoreId(null);
    setEditingChoreLabel('');
  };

  // Handler function: Adds a new person (family member) to the family
  // This is called when the user fills out the "Add Person" form and clicks "Add"
  const handleAddPerson = async () => {
    // Don't do anything if we don't have a family ID
    if (!currentFamilyId) return;
    // Clean up the input values (remove extra spaces)
    const trimmedName = newPersonName.trim();
    const trimmedEmail = newPersonEmail.trim();
    // Name and email are required - don't add if they're empty
    if (!trimmedName || !trimmedEmail) return;

    try {
      // Send request to backend to create the person
      const person = await apiClient.addPerson(
        currentFamilyId,
        trimmedName,
        trimmedEmail,
        newPersonPhone.trim() || undefined // Phone is optional
      );
      // Add the new person to our local state (so they appear immediately)
      setCurrentFamily((prev) => prev ? { ...prev, people: [...prev.people, person] } : null);
      // Clear all the input fields
      setNewPersonName('');
      setNewPersonEmail('');
      setNewPersonPhone('');
    } catch (err: any) {
      // If something went wrong (like duplicate email), show an error
      alert(err.message || 'Failed to add person');
    }
  };

  // Handler function: Removes a person from the family
  // This also removes all their chore assignments
  const handleRemovePerson = async (personId: string) => {
    try {
      // Tell backend to delete the person
      await apiClient.deletePerson(personId);
      // Update local state to remove the person and their assignments
      // filter() creates a new array without the deleted person
      setCurrentFamily((prev) => prev ? {
        ...prev,
        people: prev.people.filter((p) => p.id !== personId), // Remove person from list
        assignments: prev.assignments.filter((a) => a.person_id !== personId) // Remove their assignments
      } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove person');
    }
  };

  const handleChangePersonColor = async (personId: string, color: string) => {
    const person = people.find((p) => p.id === personId);
    if (!person) return;

    try {
      const updated = await apiClient.updatePerson(personId, person.name, person.email, person.phone, color);
      setCurrentFamily((prev) => prev ? {
        ...prev,
        people: prev.people.map((p) => (p.id === personId ? updated : p))
      } : null);
    } catch (err: any) {
      console.error('Error updating person color:', err);
    }
  };

  const handleStartEditPerson = (person: Person) => {
    setEditingPersonId(person.id);
    setEditingPersonName(person.name);
    setEditingPersonEmail(person.email);
    setEditingPersonPhone(person.phone || '');
  };

  const handleSaveEditPerson = async () => {
    const trimmedName = editingPersonName.trim();
    const trimmedEmail = editingPersonEmail.trim();
    if (!editingPersonId || !trimmedName || !trimmedEmail) {
      setEditingPersonId(null);
      setEditingPersonName('');
      setEditingPersonEmail('');
      setEditingPersonPhone('');
      return;
    }

    try {
      const person = people.find((p) => p.id === editingPersonId);
      const updated = await apiClient.updatePerson(
        editingPersonId,
        trimmedName,
        trimmedEmail,
        editingPersonPhone.trim() || undefined,
        person?.color
      );
      setCurrentFamily((prev) => prev ? {
        ...prev,
        people: prev.people.map((p) => (p.id === editingPersonId ? updated : p))
      } : null);
      setEditingPersonId(null);
      setEditingPersonName('');
      setEditingPersonEmail('');
      setEditingPersonPhone('');
    } catch (err: any) {
      alert(err.message || 'Failed to update person');
    }
  };

  const handleCancelEditPerson = () => {
    setEditingPersonId(null);
    setEditingPersonName('');
    setEditingPersonEmail('');
    setEditingPersonPhone('');
  };

  // Handler function: Creates a new family and logs in as the admin
  // This is called when the user fills out the "Create Family" form
  const handleCreateFamily = async () => {
    // Clean up the family name
    const trimmedName = newFamilyName.trim();
    if (!trimmedName) return;

    // Get and validate admin credentials
    const adminEmail = newAdminEmail.trim();
    const adminPassword = newAdminPassword.trim();
    if (!adminEmail || !adminPassword) {
      alert('Admin email and password are required');
      return;
    }

    try {
      // Send request to backend to create the family
      // The backend creates the family, admin account, and default chores
      const result = await apiClient.createFamily(trimmedName, adminEmail, adminPassword);
      // Set the current family ID (this triggers loading the family data)
      setCurrentFamilyId(result.family.id);
      // Log in as the admin (so they can manage the family)
      setLoggedInAdminId(result.admin.id);
      // Clear all the input fields
      setNewFamilyName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
    } catch (err: any) {
      // If something went wrong, show an error message
      alert(err.message || 'Failed to create family');
    }
  };

  // Handler function: Logs in an admin user
  // This is called when the user enters their email/password and clicks "Login"
  const handleAdminLogin = async () => {
    // Clean up the input values
    const trimmedEmail = adminEmail.trim();
    const trimmedPassword = adminPassword.trim();
    // Don't try to login with empty fields
    if (!trimmedEmail || !trimmedPassword) return;

    try {
      // Send login request to backend
      // The backend checks if the email/password are correct
      const result = await apiClient.adminLogin(trimmedEmail, trimmedPassword);
      // Set the current family ID (this triggers loading the family data)
      setCurrentFamilyId(result.admin.familyId);
      // Save the admin ID (so we know who's logged in)
      setLoggedInAdminId(result.admin.id);
      // Clear the login form
      setAdminEmail('');
      setAdminPassword('');
    } catch (err: any) {
      // If login failed (wrong password, etc.), show an error
      alert(err.message || 'Incorrect email or password');
    }
  };

  const handleAdminLogout = () => {
    apiClient.setToken(null);
    setLoggedInAdminId(null);
    setCurrentFamilyId(null);
    setViewingPersonId(null);
    setCurrentFamily(null);
  };

  const handleUserLogin = async () => {
    const trimmedEmail = userEmail.trim();
    if (!trimmedEmail) return;

    try {
      const result = await apiClient.userLogin(trimmedEmail);
      setCurrentFamilyId(result.person.familyId);
      setViewingPersonId(result.person.id);
      setUserEmail('');
      goToThisWeek();
    } catch (err: any) {
      alert(err.message || 'No account found with that email address');
    }
  };

  const handleAddAdmin = async () => {
    if (!currentFamilyId) return;
    const trimmedEmail = newAdminEmail.trim();
    const trimmedPassword = newAdminPassword.trim();
    if (!trimmedEmail || !trimmedPassword) return;

    try {
      const admin = await apiClient.addAdmin(currentFamilyId, trimmedEmail, trimmedPassword);
      setCurrentFamily((prev) => prev ? {
        ...prev,
        admins: [...prev.admins, { id: admin.id, email: admin.email, password: '' }]
      } : null);
      setNewAdminEmail('');
      setNewAdminPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to add admin');
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!currentFamilyId) return;
    if (currentFamily && currentFamily.admins.length <= 1) {
      alert('Cannot remove the last admin');
      return;
    }

    try {
      await apiClient.removeAdmin(currentFamilyId, adminId);
      setCurrentFamily((prev) => prev ? {
        ...prev,
        admins: prev.admins.filter((a) => a.id !== adminId)
      } : null);

      if (loggedInAdminId === adminId) {
        handleAdminLogout();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove admin');
    }
  };

  const getAssignmentsForPerson = (personId: string): Assignment[] => {
    return assignments.filter((a) => a.person_id === personId);
  };

  const getAssignmentsForPersonAndWeek = (personId: string, weekKey: string): Assignment[] => {
    return assignments.filter((a) => a.person_id === personId && a.week_start_iso === weekKey);
  };

  // Handler function: Assigns a chore to a person on a specific day
  // Called when user selects a chore from the dropdown for a specific day
  const handleAddDayChore = async (personId: string, dayIndex: number, choreId: string | '') => {
    // Don't do anything if no chore selected or no family
    if (!choreId || !currentFamilyId) return;

    try {
      // Send request to backend to create the assignment
      const assignment = await apiClient.addAssignment(
        currentFamilyId,
        personId,
        choreId,
        currentWeekKey,  // Which week (e.g., "2026-02-16")
        dayIndex         // Which day (0=Sunday, 1=Monday, etc.)
      );
      // Add the new assignment to local state (so it appears immediately)
      setCurrentFamily((prev) => prev ? {
        ...prev,
        assignments: [...prev.assignments, assignment] // Add new assignment to the list
      } : null);
    } catch (err: any) {
      // Silently fail if assignment already exists (user might click twice)
      // But log other errors
      if (!err.message?.includes('already exists')) {
        console.error('Error adding assignment:', err);
      }
    }
  };

  // Handler function: Removes a chore assignment (unassigns a chore from a person)
  // Called when user clicks the × button on a chore tag
  const handleRemoveDayChore = async (personId: string, dayIndex: number, choreId: string) => {
    // Find the assignment that matches this person, day, and chore
    // Note: Database returns snake_case (person_id) but we compare with camelCase (personId)
    const assignment = assignments.find(
      (a) =>
        a.person_id === personId &&
        a.week_start_iso === currentWeekKey &&
        a.day_index === dayIndex &&
        a.chore_id === choreId
    );

    // If assignment doesn't exist, don't do anything
    if (!assignment) return;

    try {
      // Tell backend to delete the assignment
      await apiClient.deleteAssignment(assignment.id);
      // Remove the assignment from local state
      setCurrentFamily((prev) => prev ? {
        ...prev,
        assignments: prev.assignments.filter((a) => a.id !== assignment.id) // Remove this assignment
      } : null);
    } catch (err: any) {
      console.error('Error removing assignment:', err);
    }
  };

  const getAssignmentsForCell = (personId: string, dayIndex: number): Assignment[] =>
    assignments.filter(
      (a) =>
        a.person_id === personId &&
        a.week_start_iso === currentWeekKey &&
        a.day_index === dayIndex
    );

  const getPeopleWithChoresForDate = (date: Date): Person[] => {
    const weekStartForDate = getWeekStart(date);
    const weekKey = toISODate(weekStartForDate);
    const dayIndex = date.getDay();

    const personIds = new Set(
      assignments
        .filter((a) => a.week_start_iso === weekKey && a.day_index === dayIndex)
        .map((a) => a.person_id)
    );

    return people.filter((p) => personIds.has(p.id));
  };

  const handleAddWeekChore = async (personId: string, choreId: string | '') => {
    if (!choreId || !currentFamilyId) return;

    try {
      const newAssignments = await apiClient.addWeekAssignment(
        currentFamilyId,
        personId,
        choreId,
        currentWeekKey
      );
      setCurrentFamily((prev) => prev ? {
        ...prev,
        assignments: [...prev.assignments, ...newAssignments]
      } : null);
    } catch (err: any) {
      console.error('Error adding week assignments:', err);
    }
  };

  const renderWeeklyGrid = (personId?: string) => {
    const peopleToShow = personId ? people.filter((p) => p.id === personId) : people;
    const isReadOnly = !!personId;

    if (peopleToShow.length === 0) {
      return <p className="empty">Add at least one person to assign chores.</p>;
    }

    if (chores.length === 0) {
      return <p className="empty">Add at least one chore to start assigning.</p>;
    }

    return (
      <div className="calendar-grid" role="grid" aria-label="Weekly chore assignments">
        <div className="calendar-row header" role="row">
          <div className="cell label">Person</div>
          {weekDates.map((date, index) => (
            <div key={DAYS[index]} className="cell day" role="columnheader">
              <div className="day-header">
                <span className="day-name">{DAYS[index]}</span>
                <span className="day-date">{formatDate(date)}</span>
              </div>
            </div>
          ))}
        </div>

        {peopleToShow.map((person) => (
          <div key={person.id} className="calendar-row" role="row">
            <div className="cell label person-label">
              <div className="person-label-main">
                <span className="person-name">{person.name}</span>
                {!isReadOnly && (
                  <select
                    className="week-chore-select"
                    defaultValue=""
                    onChange={(e) => {
                      const value = e.target.value;
                      handleAddWeekChore(person.id, value);
                      e.target.value = '';
                    }}
                  >
                    <option value="">Add chore to whole week...</option>
                    {chores.map((chore) => (
                      <option key={chore.id} value={chore.id}>
                        {chore.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            {DAYS.map((day, index) => (
              <div key={day} className="cell" role="gridcell">
                <div className="cell-chores">
                  <div className="chore-tags">
                    {getAssignmentsForCell(person.id, index).map((assignment) =>
                      isReadOnly ? (
                        <span key={assignment.id} className="chore-tag read-only">
                          <span>{choresMap[assignment.chore_id]?.label ?? 'Chore'}</span>
                        </span>
                      ) : (
                        <button
                          key={assignment.id}
                          type="button"
                          className="chore-tag"
                          onClick={() =>
                            handleRemoveDayChore(person.id, index, assignment.chore_id)
                          }
                        >
                          <span>{choresMap[assignment.chore_id]?.label ?? 'Chore'}</span>
                          <span aria-hidden="true">×</span>
                        </button>
                      )
                    )}
                  </div>
                  {!isReadOnly && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        handleAddDayChore(person.id, index, e.target.value);
                        e.target.value = '';
                      }}
                    >
                      <option value="">Add chore for this day...</option>
                      {chores.map((chore) => (
                        <option key={chore.id} value={chore.id}>
                          {chore.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderPersonView = () => {
    if (!viewingPersonId) return null;
    const person = people.find((p) => p.id === viewingPersonId);
    if (!person) return null;

    const personAssignments = getAssignmentsForPersonAndWeek(person.id, currentWeekKey);

    return (
      <div className="person-view">
        <div className="panel">
          <div className="panel-header-row">
            <h2>My Chores</h2>
            <button type="button" className="link-button" onClick={handleAdminLogout}>
              Switch to Admin View
            </button>
          </div>
          <div className="person-info">
            <h3>{person.name}</h3>
            <p>{person.email}</p>
            {person.phone && <p>{person.phone}</p>}
          </div>
        </div>

        <section className="panel">
          <div className="panel-header-row">
            <h2>Week of {formatDate(weekStart)} – {formatDate(weekEnd)}</h2>
            <div className="period-controls">
              <button type="button" onClick={goToPreviousWeek}>
                ‹ Previous week
              </button>
              <button type="button" onClick={goToThisWeek}>
                This week
              </button>
              <button type="button" onClick={goToNextWeek}>
                Next week ›
              </button>
            </div>
          </div>
          {renderWeeklyGrid(person.id)}
        </section>

        {viewMode === 'monthly' && (
          <section className="panel">
            <div className="panel-header-row">
              <h2>Monthly Overview</h2>
              <div className="period-controls">
                <button type="button" onClick={goToPreviousMonth}>
                  ‹ Previous month
                </button>
                <button type="button" onClick={goToThisMonth}>
                  This month
                </button>
                <button type="button" onClick={goToNextMonth}>
                  Next month ›
                </button>
              </div>
            </div>
            <div className="month-wrapper">
              <div className="month-grid" role="grid" aria-label="Monthly calendar">
                <div className="month-row header" role="row">
                  {DAYS.map((day) => (
                    <div key={day} className="month-cell month-day-name" role="columnheader">
                      {day}
                    </div>
                  ))}
                </div>
                {monthMatrix.map((week, weekIndex) => (
                  <div key={weekIndex} className="month-row" role="row">
                    {week.map((date) => {
                      const isCurrentMonthDay = date.getMonth() === currentMonth.getMonth();
                      const weekStartForDate = getWeekStart(date);
                      const weekKeyForDate = toISODate(weekStartForDate);
                      const dayIndex = date.getDay();
                      const hasChore = assignments.some(
                        (a) =>
                          a.person_id === person.id &&
                          a.week_start_iso === weekKeyForDate &&
                          a.day_index === dayIndex
                      );
                      const isToday =
                        toISODate(date) ===
                        toISODate(
                          (() => {
                            const now = new Date();
                            now.setHours(0, 0, 0, 0);
                            return now;
                          })()
                        );
                      const isInSelectedWeek =
                        weekStartForDate.getTime() === currentWeekStart.getTime();

                      const buttonClass = [
                        'month-day-button',
                        !isCurrentMonthDay ? 'outside' : '',
                        hasChore ? 'has-chores' : '',
                        isToday ? 'today' : '',
                        isInSelectedWeek ? 'current-week' : ''
                      ]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <div key={toISODate(date)} className="month-cell" role="gridcell">
                          <button
                            type="button"
                            className={buttonClass}
                            onClick={() => {
                              setCurrentWeekStart(weekStartForDate);
                              setCurrentMonth(
                                new Date(weekStartForDate.getFullYear(), weekStartForDate.getMonth(), 1)
                              );
                            }}
                          >
                            <span className="month-day-number">{date.getDate()}</span>
                            {hasChore && (
                              <span className="person-dot" style={{ backgroundColor: person.color }} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    );
  };

  const renderLoginView = () => {
    return (
      <div className="login-view">
        <section className="panel">
          <div className="panel-header-row">
            <h2>Get Started</h2>
            <div className="config-tabs" role="tablist" aria-label="Login options">
              <button
                type="button"
                role="tab"
                className={loginTab === 'createFamily' ? 'active' : ''}
                aria-selected={loginTab === 'createFamily'}
                onClick={() => setLoginTab('createFamily')}
              >
                Create Family
              </button>
              <button
                type="button"
                role="tab"
                className={loginTab === 'adminLogin' ? 'active' : ''}
                aria-selected={loginTab === 'adminLogin'}
                onClick={() => setLoginTab('adminLogin')}
              >
                Admin Login
              </button>
              <button
                type="button"
                role="tab"
                className={loginTab === 'userLogin' ? 'active' : ''}
                aria-selected={loginTab === 'userLogin'}
                onClick={() => setLoginTab('userLogin')}
              >
                User Login
              </button>
            </div>
          </div>

          {loginTab === 'createFamily' && (
            <div className="add-person-form">
              <input
                type="text"
                placeholder="Family name *"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFamily();
                  }
                }}
              />
              <input
                type="email"
                placeholder="Admin email *"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFamily();
                  }
                }}
              />
              <input
                type="password"
                placeholder="Admin password *"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFamily();
                  }
                }}
              />
              <button type="button" onClick={handleCreateFamily}>
                Create Family
              </button>
            </div>
          )}

          {loginTab === 'adminLogin' && (
            <div className="login-form">
              <input
                type="email"
                placeholder="Admin email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdminLogin();
                  }
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdminLogin();
                  }
                }}
              />
              <button type="button" onClick={handleAdminLogin}>
                Login
              </button>
            </div>
          )}

          {loginTab === 'userLogin' && (
            <div className="login-form">
              <input
                type="email"
                placeholder="Your email address"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUserLogin();
                  }
                }}
              />
              <button type="button" onClick={handleUserLogin}>
                Sign In
              </button>
              {families.length === 0 && (
                <p className="empty">No families exist yet. Create a family first.</p>
              )}
            </div>
          )}
        </section>
      </div>
    );
  };

  // Show loading state
  if (loading && currentFamilyId) {
    return (
      <div className="app-root">
        <header className="app-header">
          <div>
            <h1>Weekly Chore Calendar</h1>
            <p>Loading...</p>
          </div>
        </header>
      </div>
    );
  }

  // Show error state
  if (error && currentFamilyId) {
    return (
      <div className="app-root">
        <header className="app-header">
          <div>
            <h1>Weekly Chore Calendar</h1>
            <p style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        </header>
      </div>
    );
  }

  // Show login view if not authenticated and not viewing as person
  if (!loggedInAdminId && !viewingPersonId) {
    return (
      <div className="app-root">
        <header className="app-header">
          <div>
            <h1>Weekly Chore Calendar</h1>
            <p>Create a family or login as admin to manage chores, or view your assigned chores.</p>
          </div>
        </header>
        {renderLoginView()}
      </div>
    );
  }

  // Show person view if viewing as person
  if (viewingPersonId && !loggedInAdminId) {
    return (
      <div className="app-root">
        <header className="app-header">
          <div>
            <h1>Weekly Chore Calendar</h1>
            <p>View your assigned chores for the week.</p>
          </div>
          <div className="header-right">
            <div className="view-toggle" role="tablist" aria-label="Calendar view mode">
              <button
                type="button"
                role="tab"
                className={viewMode === 'weekly' ? 'active' : ''}
                aria-selected={viewMode === 'weekly'}
                onClick={() => setViewMode('weekly')}
              >
                Weekly
              </button>
              <button
                type="button"
                role="tab"
                className={viewMode === 'monthly' ? 'active' : ''}
                aria-selected={viewMode === 'monthly'}
                onClick={() => setViewMode('monthly')}
              >
                Monthly
              </button>
            </div>
          </div>
        </header>
        {renderPersonView()}
      </div>
    );
  }

  // Admin view
  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>Weekly Chore Calendar</h1>
          <p>
            Assign one or more chores per person on specific days, or apply a chore across the
            whole week. Switch between a focused weekly view and a broader monthly calendar.
          </p>
        </div>
        <div className="header-right">
          <button type="button" className="link-button" onClick={handleAdminLogout}>
            Logout
          </button>
          <div className="view-toggle" role="tablist" aria-label="Calendar view mode">
            <button
              type="button"
              role="tab"
              className={viewMode === 'weekly' ? 'active' : ''}
              aria-selected={viewMode === 'weekly'}
              onClick={() => setViewMode('weekly')}
            >
              Weekly
            </button>
            <button
              type="button"
              role="tab"
              className={viewMode === 'monthly' ? 'active' : ''}
              aria-selected={viewMode === 'monthly'}
              onClick={() => setViewMode('monthly')}
            >
              Monthly
            </button>
          </div>

          {viewMode === 'weekly' ? (
            <div className="week-meta">
              <span className="week-label">Week of</span>
              <span className="week-range">
                {formatDate(weekStart)} – {formatDate(weekEnd)}
              </span>
            </div>
          ) : (
            <div className="week-meta">
              <span className="week-label">Month</span>
              <span className="week-range">{formatMonthYear(currentMonth)}</span>
            </div>
          )}
        </div>
      </header>

      <section className="panel">
        <div className="panel-header-row">
          <h2>Setup - {currentFamily?.name || 'Family'}</h2>
          <div className="config-tabs" role="tablist" aria-label="Setup">
            <button
              type="button"
              role="tab"
              className={configTab === 'people' ? 'active' : ''}
              aria-selected={configTab === 'people'}
              onClick={() => setConfigTab('people')}
            >
              People
            </button>
            <button
              type="button"
              role="tab"
              className={configTab === 'chores' ? 'active' : ''}
              aria-selected={configTab === 'chores'}
              onClick={() => setConfigTab('chores')}
            >
              Chores
            </button>
            <button
              type="button"
              role="tab"
              className={configTab === 'admins' ? 'active' : ''}
              aria-selected={configTab === 'admins'}
              onClick={() => setConfigTab('admins')}
            >
              Admins
            </button>
          </div>
        </div>

        {configTab === 'people' ? (
          <>
            <div className="add-person-form">
              <input
                type="text"
                placeholder="Name *"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddPerson();
                  }
                }}
              />
              <input
                type="email"
                placeholder="Email *"
                value={newPersonEmail}
                onChange={(e) => setNewPersonEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddPerson();
                  }
                }}
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={newPersonPhone}
                onChange={(e) => setNewPersonPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddPerson();
                  }
                }}
              />
              <button type="button" onClick={handleAddPerson}>
                Add
              </button>
            </div>
            {people.length === 0 ? (
              <p className="empty">No people yet. Add someone to start assigning chores.</p>
            ) : (
              <ul className="people-list">
                {people.map((person) => (
                  <li key={person.id}>
                    <span className="person-list-main">
                      <span className="person-list-color">
                        <span
                          className="person-dot"
                          style={{ backgroundColor: person.color }}
                          aria-hidden="true"
                        />
                      </span>
                      {editingPersonId === person.id ? (
                        <div className="person-edit-form">
                          <input
                            type="text"
                            className="inline-edit-input"
                            placeholder="Name"
                            value={editingPersonName}
                            onChange={(e) => setEditingPersonName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEditPerson();
                              } else if (e.key === 'Escape') {
                                handleCancelEditPerson();
                              }
                            }}
                          />
                          <input
                            type="email"
                            className="inline-edit-input"
                            placeholder="Email"
                            value={editingPersonEmail}
                            onChange={(e) => setEditingPersonEmail(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEditPerson();
                              } else if (e.key === 'Escape') {
                                handleCancelEditPerson();
                              }
                            }}
                          />
                          <input
                            type="tel"
                            className="inline-edit-input"
                            placeholder="Phone (optional)"
                            value={editingPersonPhone}
                            onChange={(e) => setEditingPersonPhone(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEditPerson();
                              } else if (e.key === 'Escape') {
                                handleCancelEditPerson();
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="person-info-display">
                          <button
                            type="button"
                            className="unstyled-button"
                            onClick={() => handleStartEditPerson(person)}
                            title="Click to edit"
                          >
                            {person.name}
                          </button>
                          <div className="person-email">{person.email}</div>
                          {person.phone && <div className="person-phone">{person.phone}</div>}
                        </div>
                      )}
                    </span>
                    <div className="person-actions">
                      <input
                        type="color"
                        aria-label={`Color for ${person.name}`}
                        className="person-color-input"
                        value={person.color}
                        onChange={(e) => handleChangePersonColor(person.id, e.target.value)}
                      />
                      {editingPersonId === person.id ? (
                        <>
                          <button
                            type="button"
                            className="link-button"
                            onClick={handleSaveEditPerson}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="link-button"
                            onClick={handleCancelEditPerson}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleRemovePerson(person.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : configTab === 'chores' ? (
          <>
            <div className="add-chore-row">
              <input
                type="text"
                placeholder="Add chore name..."
                value={newChoreLabel}
                onChange={(e) => setNewChoreLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddChore();
                  }
                }}
              />
              <button type="button" onClick={handleAddChore}>
                Add
              </button>
            </div>
            {chores.length === 0 ? (
              <p className="empty">No chores yet. Add one to start assigning.</p>
            ) : (
              <ul className="people-list chores-list">
                {chores.map((chore) => (
                  <li key={chore.id}>
                    {editingChoreId === chore.id ? (
                      <input
                        type="text"
                        className="inline-edit-input"
                        value={editingChoreLabel}
                        onChange={(e) => setEditingChoreLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEditChore();
                          } else if (e.key === 'Escape') {
                            handleCancelEditChore();
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="unstyled-button"
                        onClick={() => handleStartEditChore(chore)}
                        title="Click to edit chore"
                      >
                        {chore.label}
                      </button>
                    )}
                    <div className="person-actions">
                      {editingChoreId === chore.id ? (
                        <>
                          <button
                            type="button"
                            className="link-button"
                            onClick={handleSaveEditChore}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="link-button"
                            onClick={handleCancelEditChore}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleRemoveChore(chore.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="add-person-form">
              <input
                type="email"
                placeholder="Admin email *"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddAdmin();
                  }
                }}
              />
              <input
                type="password"
                placeholder="Admin password *"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddAdmin();
                  }
                }}
              />
              <button type="button" onClick={handleAddAdmin}>
                Add Admin
              </button>
            </div>
            {currentFamily && currentFamily.admins.length === 0 ? (
              <p className="empty">No admins yet. Add one to manage the family.</p>
            ) : (
              <ul className="people-list">
                {currentFamily?.admins.map((admin) => (
                  <li key={admin.id}>
                    <span className="person-info-display">
                      <div>{admin.email}</div>
                    </span>
                    <div className="person-actions">
                      {currentFamily && currentFamily.admins.length > 1 ? (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleRemoveAdmin(admin.id)}
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="empty" style={{ fontSize: '0.75rem' }}>
                          Cannot remove last admin
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-header-row">
          <h2>{viewMode === 'weekly' ? 'Weekly Assignments' : 'Monthly Overview'}</h2>
          <div className="period-controls" aria-label="Change week or month">
            {viewMode === 'weekly' ? (
              <>
                <button type="button" onClick={goToPreviousWeek}>
                  ‹ Previous week
                </button>
                <button type="button" onClick={goToThisWeek}>
                  This week
                </button>
                <button type="button" onClick={goToNextWeek}>
                  Next week ›
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={goToPreviousMonth}>
                  ‹ Previous month
                </button>
                <button type="button" onClick={goToThisMonth}>
                  This month
                </button>
                <button type="button" onClick={goToNextMonth}>
                  Next month ›
                </button>
              </>
            )}
          </div>
        </div>

        {viewMode === 'weekly' ? (
          renderWeeklyGrid()
        ) : (
          <div className="month-wrapper">
            <p className="empty">
              Click a date below to focus that week and see the people and chores for that week.
            </p>
            <div className="month-grid" role="grid" aria-label="Monthly calendar">
              <div className="month-row header" role="row">
                {DAYS.map((day) => (
                  <div key={day} className="month-cell month-day-name" role="columnheader">
                    {day}
                  </div>
                ))}
              </div>
              {monthMatrix.map((week, weekIndex) => (
                <div key={weekIndex} className="month-row" role="row">
                  {week.map((date) => {
                    const isCurrentMonthDay = date.getMonth() === currentMonth.getMonth();
                    const peopleWithChores = getPeopleWithChoresForDate(date);
                    const hasChores = peopleWithChores.length > 0;
                    const isToday =
                      toISODate(date) ===
                      toISODate(
                        (() => {
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          return now;
                        })()
                      );
                    const isInSelectedWeek = getWeekStart(date).getTime() === currentWeekStart.getTime();

                    const buttonClass = [
                      'month-day-button',
                      !isCurrentMonthDay ? 'outside' : '',
                      hasChores ? 'has-chores' : '',
                      isToday ? 'today' : '',
                      isInSelectedWeek ? 'current-week' : ''
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <div key={toISODate(date)} className="month-cell" role="gridcell">
                        <button
                          type="button"
                          className={buttonClass}
                          onClick={() => {
                            const start = getWeekStart(date);
                            setCurrentWeekStart(start);
                            setCurrentMonth(
                              new Date(start.getFullYear(), start.getMonth(), 1)
                            );
                          }}
                        >
                          <span className="month-day-number">{date.getDate()}</span>
                          {hasChores && (
                            <span className="month-day-people">
                              {peopleWithChores.map((person) => (
                                <span
                                  key={person.id}
                                  className="person-dot"
                                  style={{ backgroundColor: person.color }}
                                  title={person.name}
                                />
                              ))}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="month-week-detail">
              <h3 className="month-week-heading">
                Week of {formatDate(weekStart)} – {formatDate(weekEnd)}
              </h3>
              {renderWeeklyGrid()}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
