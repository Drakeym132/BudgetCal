import { Maximize, Minimize, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const electronApi = typeof window !== 'undefined' ? window.electronApi : null;

  useEffect(() => {
    if (!electronApi?.isWindowMaximized) return undefined;

    let cleanup;
    electronApi.isWindowMaximized().then((value) => setIsMaximized(!!value));
    cleanup = electronApi.onMaximizeChange?.((state) => setIsMaximized(state));
    return () => cleanup?.();
  }, [electronApi]);

  const handleToggleMaximize = () => {
    const toggleResult = electronApi?.toggleMaximize?.();
    if (toggleResult?.then) {
      toggleResult.then((value) => {
        if (typeof value === 'boolean') {
          setIsMaximized(value);
        }
      });
    }
  };

  const handleMinimize = () => electronApi?.minimizeWindow?.();
  const handleClose = () => electronApi?.closeWindow?.();

  const platform = electronApi?.platform;
  const isMac = platform === 'darwin';

  return (
    <header className={`title-bar ${isMac ? 'title-bar--mac' : 'title-bar--windows'}`}>
      <div className="title-bar__chrome">
        <div className="title-bar__drag-region" />
        {isMac ? (
          <div className="window-controls window-controls--mac">
            <button
              type="button"
              className="window-control-btn close"
              onClick={handleClose}
              aria-label="Close window"
            >
              <X size={10} />
            </button>

            <button
              type="button"
              className="window-control-btn minimize"
              onClick={handleMinimize}
              aria-label="Minimize window"
            >
              <Minimize size={10} />
            </button>

            <button
              type="button"
              className="window-control-btn maximize"
              onClick={handleToggleMaximize}
              aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            >
              {isMaximized ? <Square size={10} /> : <Maximize size={10} />}
            </button>
          </div>
        ) : (
          <div className="window-controls window-controls--windows">
            <button
              type="button"
              className="window-control-btn"
              onClick={handleMinimize}
              aria-label="Minimize window"
            >
              <Minimize size={14} />
            </button>

            <button
              type="button"
              className="window-control-btn"
              onClick={handleToggleMaximize}
              aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            >
              {isMaximized ? <Square size={14} /> : <Maximize size={14} />}
            </button>

            <button
              type="button"
              className="window-control-btn close"
              onClick={handleClose}
              aria-label="Close window"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default TitleBar;
