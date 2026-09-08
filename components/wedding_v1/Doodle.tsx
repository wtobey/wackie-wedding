export default function Doodle({ kind = "flower", className = "" }: { kind?: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "flower" && <><path d="M50 71v22m0-9c-13 0-20-7-20-15 13 0 20 6 20 15m1-6c11-1 18-7 18-16-11 0-18 8-18 16"/><path d="M50 24C33 1 22 22 34 34 8 26 7 53 32 50 12 68 36 82 44 60c3 28 29 17 18-4 23 12 32-15 8-18 24-16 4-35-11-17C65-4 40-4 50 24Z"/><circle cx="49" cy="41" r="10"/></>}
      {kind === "trees" && <><path d="M29 89V23m0-17L9 40h12L5 63h17L8 78h43L36 62h16L37 41h12L29 6Zm43 84V40m0-19L58 47h8L54 66h12L57 79h33L80 66h11L79 47h9L72 21M7 92c26-6 57-4 87 0"/></>}
      {kind === "cheers" && <><path d="m17 15 27 8-7 28c-3 14-29 7-25-7l5-29Zm13 41-8 27m-12-3 24 7M56 23l27-8 5 29c4 14-22 21-25 7l-7-28Zm14 33 8 27m-12 4 24-7M15 35l23 7m24 0 23-7M50 7v8m-9-7 3 7m15-7-3 7"/></>}
      {kind === "coffee" && <><path d="M17 37h55v19c0 33-55 33-55 0V37Zm55 4h9c21 0 13 24-9 22M8 85h78M32 25c-9-13 9-10 0-24m18 24c-9-13 9-10 0-24m16 24c-9-13 9-10 0-24"/></>}
      {kind === "sun" && <><circle cx="50" cy="50" r="23"/><path d="M50 4v12m0 68v12M4 50h12m68 0h12M17 17l9 9m48 48 9 9M17 83l9-9m48-48 9-9M32 7l5 12m26 62 5 12M7 32l12 5m62 26 12 5M7 68l12-5m62-26 12-5M32 93l5-12M63 19l5-12M39 50h1m20 0h1m-20 9c7 7 13 7 20 0"/></>}
      {kind === "river" && <><path d="M3 30c19-20 28 20 47 0s27 20 47 0M3 50c19-20 28 20 47 0s27 20 47 0M3 70c19-20 28 20 47 0s27 20 47 0"/></>}
    </svg>
  );
}
