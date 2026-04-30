
/** Returns true if media selectors report a dark theme preference */
export const isDarkMode: () => boolean = "matchMedia" in window ? ((w: Window) => {
    const query = w.matchMedia(`(prefers-color-scheme: dark)`);
    return (() => query.matches);
})(window) : (() => false);
