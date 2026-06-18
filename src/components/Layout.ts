export function exportLayout(callback?: () => void, closeAfterExport?: boolean) {
  try {
    const layoutState = {
      docks: localStorage.getItem('dockState'),
      sidebar: localStorage.getItem('sidebarState'),
      theme: localStorage.getItem('theme'),
      timestamp: Date.now(),
    };
    localStorage.setItem('layoutExport', JSON.stringify(layoutState));
  } catch (e) {
    console.error('Failed to export layout:', e);
  }

  if (callback) {
    callback();
  }

  if (closeAfterExport) {
    window.close();
  }
}
