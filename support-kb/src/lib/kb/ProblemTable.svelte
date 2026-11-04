<script lang="ts">
  import { countBy, inTicket, problemOf, PROBLEMS, type Problem } from '#lib/kb/problems';

  let { ticket, issues }: { ticket: number; issues: Record<Problem, { name: string; href: string }> } = $props();

  const n = $derived(countBy(ticket));
  const rows = $derived(
    PROBLEMS.map((p) => {
      const rs = inTicket(ticket).filter((r) => problemOf(r) === p);
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return { p, count: rs.length, tenants: new Set(rs.map((r) => r.tenant)).size, first: days[0], last: days[days.length - 1], example: rs[0]?.id };
    }),
  );
  const total = $derived(n.parser + n.hint + n['one-day'] + n.unplaced);
</script>

<table>
  <thead><tr><th>problem</th><th>reports</th><th>tenants</th><th>seen</th><th>e.g.</th><th>issue</th></tr></thead>
  <tbody>
    {#each rows as r (r.p)}
      <tr>
        <td>{issues[r.p].name}</td>
        <td><strong>{r.count}</strong></td>
        <td>{r.tenants}</td>
        <td>{r.first} → {r.last}</td>
        <td><code>{r.example}</code></td>
        <td><a href={issues[r.p].href}>{issues[r.p].href.replace(/^https:\/\/github\.com\//, '')}</a></td>
      </tr>
    {/each}
  </tbody>
  <tfoot>
    <tr><td>total</td><td><strong>{total}</strong></td><td colspan="4">{n.unplaced ? `${n.unplaced} unplaced` : 'every report placed'}</td></tr>
  </tfoot>
</table>

<style>
  tfoot td { border-top: 2px solid var(--line); }
</style>
