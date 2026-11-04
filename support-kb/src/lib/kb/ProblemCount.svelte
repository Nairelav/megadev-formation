<script lang="ts">
  import { countBy, facts, type Problem } from '#lib/kb/problems';

  // One computed number, inline. `problem` for a problem's count, `total` for all reports,
  // `fact` for one of facts().
  let { ticket, problem, total = false, fact }: {
    ticket: number;
    problem?: Problem;
    total?: boolean;
    fact?: keyof ReturnType<typeof facts>;
  } = $props();

  const value = $derived.by(() => {
    if (fact) return facts(ticket)[fact];
    const n = countBy(ticket);
    if (total) return n.parser + n.hint + n['one-day'] + n.unplaced;
    return problem ? n[problem] : '';
  });
</script>

<strong>{value}</strong>
