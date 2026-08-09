import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 1. Initialize state based on localStorage OR OS system preference
  const [darkMode, setDarkMode] = useState(() => {
    // Check if the user has a saved preference
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    // If no saved preference, default to their operating system's theme
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // 2. Sync the DOM and localStorage whenever the state changes
  useEffect(() => {
    const root = document.documentElement;
    
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("app-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("app-theme", "light");
    }
  }, [darkMode]);

  // 3. Simple toggle function
  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 4. Custom hook with built-in error handling
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}