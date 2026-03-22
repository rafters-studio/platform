import { generateRaftersHarmony } from "@rafters/color-utils";
import type { ColorValue } from "@rafters/shared";
import { classy } from "@rafters/ui/primitives/classy";
import { Container } from "@rafters/ui/components/ui/container";
import { Separator } from "@rafters/ui/components/ui/separator";
import { H1, H3, H4, Lead, Muted, P } from "@rafters/ui/components/ui/typography";
import { useMemo } from "react";

interface ColorIntelligenceProps {
  color: ColorValue;
  onPrimaryClick?: () => void;
}

function oklch(c: { l: number; c: number; h: number }): string {
  return `oklch(${c.l.toFixed(3)} ${c.c.toFixed(3)} ${Math.round(c.h)})`;
}

const SCALE_POSITIONS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];

function describeCapability(acc: NonNullable<ColorValue["accessibility"]>): string {
  const parts: string[] = [];
  if (acc.onWhite.wcagAAA) parts.push("body text on light surfaces");
  else if (acc.onWhite.wcagAA) parts.push("headings on light surfaces");
  if (acc.onBlack.wcagAAA) parts.push("body text on dark surfaces");
  else if (acc.onBlack.wcagAA) parts.push("headings on dark surfaces");
  if (acc.apca) {
    const lc = Math.max(Math.abs(acc.apca.onWhite), Math.abs(acc.apca.onBlack));
    if (lc >= 90) parts.push("fluent reading at any size");
    else if (lc >= 75) parts.push("content text down to 16px");
    else if (lc >= 60) parts.push("headlines and UI chrome");
    else if (lc >= 45) parts.push("large elements and icons");
  }
  if (parts.length === 0) return "Decorative use. Pair with high-contrast text.";
  return `Can carry ${parts.join(", ")}.`;
}

export default function ColorIntelligence({ color, onPrimaryClick }: ColorIntelligenceProps) {
  const scale = color.scale ?? [];
  // Base is at index 6 (position 600). Known bug: scale generation can
  // produce inverted lightness for very dark inputs (see issue below).
  const base = scale[6];
  const intel = color.intelligence;
  const analysis = color.analysis;
  const atmo = color.atmosphericWeight;
  const percept = color.perceptualWeight;
  const harmonies = color.harmonies;
  const acc = color.accessibility;

  const wavePath = useMemo(() => {
    if (scale.length === 0) return "";
    const maxC = Math.max(...scale.map((s) => s.c), 0.001);
    const points = scale.map((step, i) => ({
      x: (i / (scale.length - 1)) * 100,
      y: 100 - (step.c / maxC) * 80 - 10,
    }));
    let d = `M ${points[0]!.x} ${points[0]!.y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!;
      const curr = points[i]!;
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    d += ` L 100 100 L 0 100 Z`;
    return d;
  }, [scale]);

  // Use generateRaftersHarmony for correct role mapping, not raw API harmonies
  const roles = useMemo(() => {
    if (!base) return null;
    return generateRaftersHarmony({ l: base.l, c: base.c, h: base.h, alpha: 1 });
  }, [base]);

  // Distance from center driven by hue distance from primary
  const harmonyItems = useMemo(() => {
    if (!roles || !base) return [];
    const baseH = base.h;
    const hueDist = (h: number) => {
      const d = Math.abs(h - baseH);
      return Math.min(d, 360 - d) / 180; // 0 = same hue, 1 = complementary
    };
    const items = [
      { color: roles.accent, label: "accent" },
      { color: roles.secondary, label: "secondary" },
      { color: roles.tertiary, label: "tertiary" },
      { color: roles.highlight, label: "highlight" },
    ];
    return items.map((item) => ({
      ...item,
      distance: 0.3 + hueDist(item.color.h) * 0.65, // 0.3 min, ~0.95 max
    }));
  }, [roles, base]);

  return (
    <div className={classy("@container min-h-screen bg-background text-foreground")}>
      {/* Breadcrumbs */}
      <Container as="header" size="7xl" padding="6">
        <Muted className={classy("text-muted-foreground block")}>
          {analysis?.temperature ?? ""} / {atmo?.atmosphericRole ?? ""} / {percept?.density ?? ""}
        </Muted>
      </Container>

      {/* TWO COLUMNS: left = visual, right = name + intelligence */}
      <Container as="main" size="7xl" padding="6">
        <div className={classy("grid grid-cols-12 gap-8")}>
          {/* LEFT COLUMN: constellation, semantics, scale, contrast, weight */}
          <div className={classy("col-span-5 flex flex-col gap-8")}>
            {/* Harmony constellation */}
            {harmonies && base && (
              <div className={classy("flex flex-col items-center")}>
                <H4 className={classy("text-muted-foreground")}>harmonies</H4>
                <svg viewBox="-50 -50 100 100" className={classy("max-w-xs text-muted-foreground")}>
                  {harmonyItems.map((item, i) => {
                    const orbitR = item.distance * 42;
                    return (
                      <circle
                        key={`orbit-${i}`}
                        cx="0"
                        cy="0"
                        r={orbitR}
                        fill="none"
                        stroke={oklch(item.color)}
                        strokeWidth="0.3"
                        strokeDasharray="2 2"
                        opacity="0.4"
                      />
                    );
                  })}
                  {harmonyItems.map((item, i) => {
                    const angle = ((item.color.h - 90) / 360) * Math.PI * 2;
                    const r = item.distance * 42;
                    const cx = Math.cos(angle) * r;
                    const cy = Math.sin(angle) * r;
                    return (
                      <g key={`${item.label}-${i}`}>
                        <line
                          x1="0"
                          y1="0"
                          x2={cx}
                          y2={cy}
                          stroke="currentColor"
                          strokeWidth="0.2"
                        />
                        <circle cx={cx} cy={cy} r="5" fill={oklch(item.color)} />
                        <text
                          x={cx}
                          y={cy + 9}
                          textAnchor="middle"
                          fill="currentColor"
                          fontSize="3"
                        >
                          {item.label}
                        </text>
                      </g>
                    );
                  })}
                  <circle
                    cx="0"
                    cy="0"
                    r="10"
                    fill={oklch(base)}
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className={classy("cursor-pointer")}
                    onClick={onPrimaryClick}
                  />
                  <text x="0" y="15" textAnchor="middle" fill="currentColor" fontSize="3">
                    primary
                  </text>
                </svg>
              </div>
            )}

            {/* Semantic companions */}
            {color.semanticSuggestions && (
              <div className={classy("flex gap-8 justify-center")}>
                {(["danger", "success", "warning", "info"] as const).map((role) => {
                  const suggestions = color.semanticSuggestions?.[role];
                  if (!suggestions || suggestions.length === 0) return null;
                  return (
                    <div key={role} className={classy("flex flex-col items-center gap-2")}>
                      <div className={classy("flex gap-1")}>
                        {suggestions.map((s, i) => (
                          <div
                            key={`${role}-${i}`}
                            className={classy("rounded-full")}
                            style={{
                              width: i === 0 ? "20px" : "14px",
                              height: i === 0 ? "20px" : "14px",
                              background: oklch(s),
                              opacity: i === 0 ? 1 : 0.6,
                            }}
                          />
                        ))}
                      </div>
                      <Muted className={classy("text-muted-foreground")}>{role}</Muted>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Scale wave */}
            {scale.length > 0 && (
              <div>
                <H4 className={classy("text-muted-foreground")}>scale</H4>
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className={classy("w-full h-32 block")}
                >
                  <defs>
                    <linearGradient id="scale-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      {scale.map((step, i) => (
                        <stop
                          key={SCALE_POSITIONS[i]}
                          offset={`${(i / (scale.length - 1)) * 100}%`}
                          stopColor={oklch(step)}
                        />
                      ))}
                    </linearGradient>
                  </defs>
                  {wavePath && <path d={wavePath} fill="url(#scale-gradient)" />}
                </svg>
                <div className={classy("flex justify-between mt-1")}>
                  {scale.map((_, i) => (
                    <Muted
                      key={SCALE_POSITIONS[i]}
                      className={classy("font-mono text-muted-foreground")}
                    >
                      {SCALE_POSITIONS[i]}
                    </Muted>
                  ))}
                </div>
              </div>
            )}

            {/* Weight */}
            {(atmo || percept) && (
              <div className={classy("flex gap-8")}>
                {atmo && (
                  <div>
                    <H4 className={classy("text-muted-foreground")}>atmospheric</H4>
                    <P>{atmo.atmosphericRole}</P>
                    <Muted>{(atmo.distanceWeight * 100).toFixed(0)}% foreground</Muted>
                  </div>
                )}
                {percept && (
                  <div>
                    <H4 className={classy("text-muted-foreground")}>perceptual</H4>
                    <P>{percept.density}</P>
                    <Muted>{percept.balancingRecommendation}</Muted>
                  </div>
                )}
              </div>
            )}

            {/* Contrast */}
            {acc && (
              <div>
                <H4 className={classy("text-muted-foreground")}>contrast</H4>
                <P className={classy("text-muted-foreground")}>{describeCapability(acc)}</P>
                <ContrastMatrix scale={scale} pairs={acc.wcagAA?.normal ?? []} />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: name, emotional impact, then intelligence */}
          <div className={classy("col-span-7 flex flex-col gap-6")}>
            {/* Name and emotional truth */}
            <div>
              <H1>{color.name}</H1>
              {intel?.emotionalImpact && <Lead>{intel.emotionalImpact}</Lead>}
            </div>

            <Separator />

            {/* Cultural context and reasoning as two sub-columns */}
            {intel && (intel.culturalContext || intel.reasoning) && (
              <div className={classy("grid grid-cols-2 gap-6")}>
                {intel.culturalContext && (
                  <div>
                    <H4 className={classy("text-muted-foreground")}>cultural context</H4>
                    <P>{intel.culturalContext}</P>
                  </div>
                )}
                {intel.reasoning && (
                  <div>
                    <H4 className={classy("text-muted-foreground")}>reasoning</H4>
                    <P>{intel.reasoning}</P>
                  </div>
                )}
              </div>
            )}

            {intel?.usageGuidance && (
              <>
                <Separator />
                <div>
                  <H4 className={classy("text-muted-foreground")}>usage</H4>
                  <P>{intel.usageGuidance}</P>
                </div>
              </>
            )}
            {intel?.accessibilityNotes && (
              <div>
                <H4 className={classy("text-muted-foreground")}>accessibility notes</H4>
                <P>{intel.accessibilityNotes}</P>
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* FOOTER */}
      {base && (
        <>
          <Separator className={classy("mt-8")} />
          <Container
            as="footer"
            size="7xl"
            padding="6"
            className={classy("flex items-center justify-between font-mono")}
          >
            <Muted className={classy("text-muted-foreground")}>
              oklch({base.l.toFixed(3)} {base.c.toFixed(3)} {Math.round(base.h)})
            </Muted>
            <Muted className={classy("text-muted-foreground")}>
              {scale.length} positions{color.tokenId ? ` / ${color.tokenId}` : ""}
            </Muted>
          </Container>
        </>
      )}
    </div>
  );
}

function ContrastMatrix({
  scale,
  pairs,
}: {
  scale: { l: number; c: number; h: number }[];
  pairs: number[][];
}) {
  const passingSet = useMemo(() => {
    const set = new Set<string>();
    for (const pair of pairs) {
      if (pair[0] !== undefined && pair[1] !== undefined) {
        set.add(`${pair[0]}-${pair[1]}`);
      }
    }
    return set;
  }, [pairs]);

  return (
    <div
      className={classy("grid gap-px")}
      style={{ gridTemplateColumns: `auto repeat(${scale.length}, 1fr)` }}
    >
      {/* Header row: background scale labels */}
      <div />
      {scale.map((_, bg) => (
        <Muted
          key={`h-${SCALE_POSITIONS[bg]}`}
          className={classy("font-mono text-muted-foreground text-center")}
        >
          {SCALE_POSITIONS[bg]}
        </Muted>
      ))}

      {/* Grid rows: foreground x background */}
      {scale.map((fgStep, fg) => (
        <>
          <Muted
            key={`l-${fg}`}
            className={classy("font-mono text-muted-foreground flex items-center")}
          >
            {SCALE_POSITIONS[fg]}
          </Muted>
          {scale.map((bgStep, bg) => {
            const passes = passingSet.has(`${fg}-${bg}`);
            return (
              <div
                key={`${fg}-${bg}`}
                className={classy("flex items-center justify-center")}
                style={{
                  background: oklch(bgStep),
                  aspectRatio: "1",
                }}
              >
                {passes && (
                  <span
                    className={classy("font-mono")}
                    style={{
                      color: oklch(fgStep),
                      fontSize: "0.6rem",
                      lineHeight: 1,
                    }}
                  >
                    {SCALE_POSITIONS[fg]}
                  </span>
                )}
              </div>
            );
          })}
        </>
      ))}
    </div>
  );
}
