const paths = {
  sprint: "M8 3h8l4 4v14H4V3h4m6 0v6h6M8 13h8M8 17h5",
  history: "M3 10a9 9 0 1 1 1 8M3 4v6h6M12 7v5l3 2",
  documents: "M3 7V4h6l2 3h10v13H3V7Zm0 4h18",
};

export default function NavIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      className="nav-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
