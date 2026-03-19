import * as React from "react";

interface ColorAnalysis {
	input: string;
	oklch: { l: number; c: number; h: number };
	hex: string;
	perception: {
		temperature: "cool" | "neutral" | "warm";
		luminanceCategory: "dark" | "mid" | "light";
		saturationCategory: "muted" | "moderate" | "vivid";
		isNeutral: boolean;
	};
	contrast: {
		white: number;
		black: number;
		wcagAANormal: boolean;
		wcagAALarge: boolean;
		wcagAAA: boolean;
		recommendedForeground: "white" | "black";
	};
	harmony: {
		complementary: { l: number; c: number; h: number };
		analogous: { l: number; c: number; h: number }[];
		triadic: { l: number; c: number; h: number }[];
		splitComplementary: { l: number; c: number; h: number }[];
	};
}

function oklchToCss(c: { l: number; c: number; h: number }): string {
	return `oklch(${c.l} ${c.c} ${c.h})`;
}

function Swatch({
	color,
	label,
	size = "md",
}: {
	color: { l: number; c: number; h: number };
	label: string;
	size?: "sm" | "md" | "lg";
}) {
	const sizeClass =
		size === "lg" ? "h-24 w-24" : size === "md" ? "h-12 w-12" : "h-8 w-8";
	return (
		<div className="flex flex-col items-center gap-1">
			<div
				className={`${sizeClass} rounded-lg border border-neutral-200`}
				style={{ backgroundColor: oklchToCss(color) }}
				title={`oklch(${color.l} ${color.c} ${color.h})`}
			/>
			<span className="text-xs text-neutral-500">{label}</span>
		</div>
	);
}

function Badge({
	children,
	pass,
}: {
	children: React.ReactNode;
	pass: boolean;
}) {
	return (
		<span
			className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
				pass
					? "bg-emerald-50 text-emerald-700"
					: "bg-red-50 text-red-700"
			}`}
		>
			{children}
		</span>
	);
}

export default function ColorPlayground() {
	const [input, setInput] = React.useState("#3b82f6");
	const [analysis, setAnalysis] = React.useState<ColorAnalysis | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);

	const analyze = React.useCallback(async (colorValue: string) => {
		if (!colorValue.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`/api/v2/color/analyze?color=${encodeURIComponent(colorValue)}`,
			);
			if (!res.ok) {
				const data = await res.json();
				setError(data.error ?? "Unknown error");
				setAnalysis(null);
			} else {
				const data = await res.json();
				setAnalysis(data);
				setError(null);
			}
		} catch {
			setError("Failed to reach API");
			setAnalysis(null);
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		analyze(input);
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		analyze(input);
	};

	return (
		<div className="flex flex-col gap-8">
			{/* Input */}
			<form onSubmit={handleSubmit} className="flex gap-3">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Any CSS color: #3b82f6, oklch(0.7 0.15 250), rebeccapurple..."
					className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
				/>
				<button
					type="submit"
					disabled={loading}
					className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
				>
					{loading ? "..." : "Analyze"}
				</button>
			</form>

			{error && (
				<p className="text-red-600 text-sm">{error}</p>
			)}

			{analysis && (
				<div className="flex flex-col gap-8">
					{/* Hero swatch + identity */}
					<div className="flex items-start gap-6">
						<div
							className="h-32 w-32 shrink-0 rounded-xl border border-neutral-200"
							style={{ backgroundColor: analysis.hex }}
						/>
						<div className="flex flex-col gap-2">
							<p className="text-2xl font-bold tracking-tight">{analysis.hex}</p>
							<p className="text-sm text-neutral-500">
								oklch({analysis.oklch.l} {analysis.oklch.c} {analysis.oklch.h})
							</p>
							<div className="flex gap-2 mt-2">
								<span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs">
									{analysis.perception.temperature}
								</span>
								<span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs">
									{analysis.perception.luminanceCategory}
								</span>
								<span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs">
									{analysis.perception.saturationCategory}
								</span>
								{analysis.perception.isNeutral && (
									<span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs">
										neutral
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Accessibility */}
					<div>
						<h3 className="text-sm font-bold mb-3">Accessibility</h3>
						<div className="flex flex-wrap gap-2">
							<Badge pass={analysis.contrast.wcagAANormal}>
								AA Normal {analysis.contrast.wcagAANormal ? "Pass" : "Fail"}
							</Badge>
							<Badge pass={analysis.contrast.wcagAALarge}>
								AA Large {analysis.contrast.wcagAALarge ? "Pass" : "Fail"}
							</Badge>
							<Badge pass={analysis.contrast.wcagAAA}>
								AAA {analysis.contrast.wcagAAA ? "Pass" : "Fail"}
							</Badge>
						</div>
						<div className="flex gap-6 mt-3">
							<div className="flex items-center gap-2">
								<div
									className="h-8 w-16 rounded flex items-center justify-center text-xs font-medium"
									style={{
										backgroundColor: analysis.hex,
										color: "white",
									}}
								>
									{analysis.contrast.white}:1
								</div>
								<span className="text-xs text-neutral-500">on white</span>
							</div>
							<div className="flex items-center gap-2">
								<div
									className="h-8 w-16 rounded flex items-center justify-center text-xs font-medium"
									style={{
										backgroundColor: analysis.hex,
										color: "black",
									}}
								>
									{analysis.contrast.black}:1
								</div>
								<span className="text-xs text-neutral-500">on black</span>
							</div>
							<span className="text-xs text-neutral-500 self-center">
								Best foreground:{" "}
								<strong>{analysis.contrast.recommendedForeground}</strong>
							</span>
						</div>
					</div>

					{/* Harmony */}
					<div>
						<h3 className="text-sm font-bold mb-3">Harmonic Relationships</h3>
						<div className="grid grid-cols-2 gap-6">
							<div>
								<p className="text-xs text-neutral-500 mb-2">Complementary</p>
								<div className="flex gap-2">
									<Swatch color={analysis.oklch} label="base" />
									<Swatch
										color={analysis.harmony.complementary}
										label="complement"
									/>
								</div>
							</div>
							<div>
								<p className="text-xs text-neutral-500 mb-2">Analogous</p>
								<div className="flex gap-2">
									<Swatch color={analysis.harmony.analogous[0]} label="-30" />
									<Swatch color={analysis.oklch} label="base" />
									<Swatch color={analysis.harmony.analogous[1]} label="+30" />
								</div>
							</div>
							<div>
								<p className="text-xs text-neutral-500 mb-2">Triadic</p>
								<div className="flex gap-2">
									<Swatch color={analysis.oklch} label="base" />
									<Swatch color={analysis.harmony.triadic[0]} label="+120" />
									<Swatch color={analysis.harmony.triadic[1]} label="+240" />
								</div>
							</div>
							<div>
								<p className="text-xs text-neutral-500 mb-2">
									Split Complementary
								</p>
								<div className="flex gap-2">
									<Swatch color={analysis.oklch} label="base" />
									<Swatch
										color={analysis.harmony.splitComplementary[0]}
										label="+150"
									/>
									<Swatch
										color={analysis.harmony.splitComplementary[1]}
										label="+210"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Raw OKLCH */}
					<div>
						<h3 className="text-sm font-bold mb-3">OKLCH Values</h3>
						<div className="grid grid-cols-3 gap-4 text-sm">
							<div className="flex flex-col items-center rounded-lg bg-neutral-50 p-4">
								<span className="text-2xl font-bold">
									{analysis.oklch.l}
								</span>
								<span className="text-xs text-neutral-500">Lightness</span>
								<div className="w-full mt-2 h-1.5 rounded-full bg-neutral-200">
									<div
										className="h-full rounded-full bg-neutral-900"
										style={{ width: `${analysis.oklch.l * 100}%` }}
									/>
								</div>
							</div>
							<div className="flex flex-col items-center rounded-lg bg-neutral-50 p-4">
								<span className="text-2xl font-bold">
									{analysis.oklch.c}
								</span>
								<span className="text-xs text-neutral-500">Chroma</span>
								<div className="w-full mt-2 h-1.5 rounded-full bg-neutral-200">
									<div
										className="h-full rounded-full bg-neutral-900"
										style={{ width: `${Math.min(analysis.oklch.c / 0.4, 1) * 100}%` }}
									/>
								</div>
							</div>
							<div className="flex flex-col items-center rounded-lg bg-neutral-50 p-4">
								<span className="text-2xl font-bold">
									{analysis.oklch.h}
								</span>
								<span className="text-xs text-neutral-500">Hue</span>
								<div className="w-full mt-2 h-1.5 rounded-full bg-neutral-200">
									<div
										className="h-full rounded-full bg-neutral-900"
										style={{ width: `${(analysis.oklch.h / 360) * 100}%` }}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
