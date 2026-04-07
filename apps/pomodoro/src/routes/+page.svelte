<script lang="ts">
  let timeLeft = $state(25 * 60); // 25 minutes in seconds
  let running = $state(false);
  let interval: ReturnType<typeof setInterval> | null = null;

  function start() {
    running = true;
    interval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft -= 1;
      } else {
        stop();
      }
    }, 1000);
  }

  function stop() {
    running = false;
    if (interval) clearInterval(interval);
  }

  function reset() {
    stop();
    timeLeft = 25 * 60;
  }

  function format(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }
</script>

<main>
  <h1>{format(timeLeft)}</h1>
  <div id="controls" class="controls-wrapper">
    <button onclick={running ? stop : start}>
      {running ? "Pause" : "Start"}
    </button>
    <button onclick={reset}>Reset</button>
  </div>
</main>