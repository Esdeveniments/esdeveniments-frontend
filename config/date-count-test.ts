// Count-line SEO test (#748; design and baseline in the issue and in
// docs/growth/competitor-features-research-2026-11.md › 4). Date pages listed
// here start their subtitle with the place's event count ("103 activitats
// avui."); `cap-de-setmana` stays unchanged as the control. Read it 6 weeks
// after the deploy. If it wins, add the other date slugs; if not, remove this
// file and its reader in PlacePageShell.
export const DATE_COUNT_TEST_DATES: ReadonlySet<string> = new Set(["avui"]);
