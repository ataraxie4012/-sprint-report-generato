import chanelLogo from "./chanel-logo.png";

const paths = {
  close: "M6 6l12 12M18 6 6 18",
  expand: "M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M3 3l6 6M21 3l-6 6M3 21l6-6M21 21l-6-6",
  target: "M21 12a9 9 0 1 1-9-9M17 3h4v4M21 3l-9 9M15 12a3 3 0 1 1-3-3",
  trend: "m3 17 6-6 4 4 8-10M15 5h6v6",
  remaining: "M12 3a9 9 0 1 0 9 9M12 7v5l3 2M16 3h5v5",
  bug: "M8 8h8v8a4 4 0 0 1-8 0V8ZM9 8V6a3 3 0 0 1 6 0v2M3 10h5M16 10h5M3 15h5M16 15h5M5 21l4-3M19 21l-4-3M12 8v12",
  add: "M12 5v14M5 12h14",
  duplicate: "M8 8h12v13H8V8ZM16 8V3H3v14h5",
  view: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  logout: "M9 5H4v14h5M13 8l4 4-4 4M8 12h12",
  settings: "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Zm6 9a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z",
  test: "M9 3h6v3H9V3Zm-1 2H5v16h14V5h-3M8 13l2 2 5-5M8 18h8",
  minutes: "M6 3h9l4 4v14H5V3h1Zm8 0v5h5M8 12h8M8 16h8M8 19h5",
  history: "M3 10a9 9 0 1 1 1 8M3 4v6h6M12 7v5l3 2",
  documents: "M3 7V4h6l2 3h10v13H3V7Zm0 4h18",
};

export default function NavIcon({ name }: { name: "sprint" | keyof typeof paths }) {
  if (name === "sprint") {
    return (
      <img
        className="nav-icon nav-chanel-logo"
        src={chanelLogo}
        width={18}
        height={18}
        alt=""
        aria-hidden="true"
      />
    );
  }

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
