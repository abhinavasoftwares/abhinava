import { Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "./context/ThemeContext";

function App() {
  const { darkMode, toggleTheme } = useTheme();  

  return (
    <main
      className={`min-h-screen flex items-center justify-center ${
        darkMode ? "dark" : ""
      }`}
      style={{
        backgroundColor: "var(--color-background)",
        color: "var(--color-foreground)",
      }}
    >
      <div className="text-center">
        <Sparkles className="mx-auto mb-6 h-10 w-10" />

        <h1 className="text-5xl font-semibold tracking-tight">
          Abhinava
        </h1>

        <p className="mt-4 opacity-60">
          Intelligent business software
        </p>

        <button
          onClick={toggleTheme}
          className="mt-8 rounded-full border border-current p-3"
        >
          {darkMode ? <Sun /> : <Moon />}
        </button>
      </div>
    </main>
  );
}

export default App;