import { Moon, Sun, Sparkles } from "lucide-react";
import { useState } from "react";

function App() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <main
      className={`min-h-screen flex items-center justify-center ${
        darkMode
          ? "bg-stone-950 text-white"
          : "bg-stone-100 text-stone-950"
      }`}
    >
      <div className="text-center">
        <Sparkles className="mx-auto mb-6 h-10 w-10" />

        <h1 className="text-5xl font-semibold tracking-tight">
          Abhinava
        </h1>

        <p
          className={`mt-4 ${
            darkMode ? "text-stone-400" : "text-stone-600"
          }`}
        >
          Intelligent business software
        </p>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="mt-8 rounded-full border border-current p-3"
        >
          {darkMode ? <Sun /> : <Moon />}
        </button>
      </div>
    </main>
  );
}

export default App;