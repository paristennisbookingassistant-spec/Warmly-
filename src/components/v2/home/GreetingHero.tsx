/**
 * components/v2/home/GreetingHero.tsx
 * Personalised greeting hero — time-aware salutation + first name.
 */

interface GreetingHeroProps {
  firstName: string;
  firstRun: boolean;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

export function GreetingHero({ firstName, firstRun }: GreetingHeroProps) {
  return (
    <div className="text-center mb-10 fade-up">
      <h1
        className="font-display leading-[1.05] text-ink mb-2"
        style={{ fontSize: 42 }}
      >
        {firstRun ? `Welcome, ${firstName}.` : `${getGreeting()} ${firstName}.`}
      </h1>
      <p className="text-[16px] text-ink-3">
        {firstRun
          ? "Let's find your first networking targets."
          : "Where do you want to go today?"}
      </p>
    </div>
  );
}
