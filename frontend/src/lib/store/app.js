import { create } from "zustand";
import { persist } from "zustand/middleware";
export const useAppStore = create()(persist((set) => ({
    connection: "checking",
    modelVersion: null,
    sidebarOpen: false,
    theme: "dark",
    setConnection: (connection) => set({ connection }),
    setModelVersion: (modelVersion) => set({ modelVersion }),
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    setTheme: (theme) => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
        localStorage.setItem("fathom.theme", theme);
        set({ theme });
    },
    toggleTheme: () => set((state) => {
        const newTheme = state.theme === "dark" ? "light" : "dark";
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(newTheme);
        localStorage.setItem("fathom.theme", newTheme);
        return { theme: newTheme };
    }),
}), {
    name: "fathom.app.v1",
    partialize: (state) => ({ theme: state.theme }),
}));
