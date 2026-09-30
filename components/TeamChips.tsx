import { Chip, ChipRow } from "@/components/Chip";
import { TEAM_IDS } from "@/lib/teams";

type LinkHref = React.ComponentProps<typeof Chip>["href"];

// 팀 칩 한 줄: 전체 · 1팀 ~ 7팀. href(팀)은 그 팀을 고른 주소 (전체면 undefined)
export function TeamChipRow({ team, href, className = "border-t border-grid pt-3" }: { team?: number; href: (team?: number) => LinkHref; className?: string }) {
  return (
    <ChipRow label="팀" className={className}>
      {[undefined, ...TEAM_IDS].map((id) => (
        <Chip key={id ?? "all"} href={href(id)} active={team === id}>
          {id ? `${id}팀` : "전체"}
        </Chip>
      ))}
    </ChipRow>
  );
}
