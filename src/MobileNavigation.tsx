export default function MobileNavigation({
  open,
  controls,
  onToggle,
}: {
  open: boolean;
  controls: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="mobile-navigation-toggle"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? "Fermer la navigation" : "Ouvrir la navigation"}
      onClick={onToggle}
    >
      <span aria-hidden="true" />
    </button>
  );
}
