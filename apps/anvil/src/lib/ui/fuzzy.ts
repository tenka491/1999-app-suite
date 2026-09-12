/** Small in-order subsequence matcher — fine for a command list this size
 *  (PRD §F7: "fuzzy matching on the frontend is fine for this small list").
 *  Returns null when query isn't a subsequence of text; otherwise a score
 *  where higher is better (rewards consecutive runs and an early start). */
export function fuzzyScore(query: string, text: string): number | null {
	if (query.length === 0) return 0;
	const q = query.toLowerCase();
	const t = text.toLowerCase();

	let qi = 0;
	let score = 0;
	let lastMatchIndex = -1;

	for (let ti = 0; ti < t.length && qi < q.length; ti++) {
		if (t[ti] !== q[qi]) continue;
		score += lastMatchIndex === ti - 1 ? 3 : 1;
		if (ti === 0) score += 2;
		lastMatchIndex = ti;
		qi++;
	}

	return qi === q.length ? score : null;
}
