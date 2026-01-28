<template>
  <div class="pomodoro">
    <header class="pomodoro__header">
      <h1 class="pomodoro__title">Pomodoro</h1>
      <div class="pomodoro__phase" :class="`is-${phase}`">
        {{ phaseLabel }}
      </div>
    </header>

    <div class="pomodoro__timer">
      <div class="pomodoro__time">{{ mm }}:<span class="pomodoro__seconds">{{ ss }}</span></div>
      <div class="pomodoro__progress">
        <div class="pomodoro__bar" :style="{ width: progressPercent + '%' }" />
      </div>
    </div>

    <div class="pomodoro__controls">
      <button class="btn" @click="toggle">
        <span v-if="!running">Start</span>
        <span v-else>Pause</span>
      </button>
      <button class="btn btn--ghost" @click="reset">Reset</button>
      <button class="btn btn--ghost" @click="skip">Skip</button>
    </div>

    <footer class="pomodoro__footer">
      <div class="pomodoro__stat">
        <span class="pomodoro__label">Completed</span>
        <strong class="pomodoro__value">{{ completed }}</strong>
      </div>
      <div class="pomodoro__settings">
        <label>
          Work
          <input type="number" min="1" max="90" v-model.number="workMin" /> min
        </label>
        <label>
          Break
          <input type="number" min="1" max="30" v-model.number="breakMin" /> min
        </label>
      </div>
    </footer>
  </div>
</template>

<script>
import { notifyBreakStart, notifyWorkStart } from "../services/notifications"
import { ref, onMounted, watch } from "vue";
import { getSettings, saveSettings } from "../utils/settings";

const workMinutes = ref(25);
const breakMinutes = ref(5);

onMounted(async () => {
  const settings = await getSettings();
  workMinutes.value = settings.workMinutes;
  breakMinutes.value = settings.breakMinutes;
});

// Watch for changes and save automatically
// watch([workMinutes, workMinutes], ([newWork, newBreak]) => {
//   saveSettings({ workMinutes: newWork, breakMinutes: newBreak });
// });

const chime = new Audio(new URL('../assets/sounds/focus_chime.wav', import.meta.url).toString());

export default {
  name: "PomodoroTimer",

  data() {
    return {
      phase: "work", // "work" or "break"
      running: false,
      completed: 0,
      workMin: workMinutes,
      breakMin: breakMinutes,
      remaining: 25 * 60,
      timerId: null,
    }
  },

  computed: {
    totalSeconds() {
      return (this.phase === "work" ? this.workMin : this.breakMin) * 60
    },
    mm() {
      return String(Math.floor(this.remaining / 60)).padStart(2, "0")
    },
    ss() {
      return String(this.remaining % 60).padStart(2, "0")
    },
    progressPercent() {
      const elapsed = this.totalSeconds - this.remaining
      return Math.round((elapsed / this.totalSeconds) * 100)
    },
    phaseLabel() {
      return this.phase === "work" ? "Focus" : "Break"
    },
  },

  watch: {
    phase() {
      if (!this.running) {
        this.remaining = this.totalSeconds
      }
    },
    workMin() {
      if (!this.running && this.phase === "work") {
        this.remaining = this.totalSeconds
      }
      console.log('saving workMin: ', this.workMin)
      saveSettings({workMinutes: this.workMin, breakMinutes: this.breakMin});
    },
    breakMin() {
      if (!this.running && this.phase === "break") {
        this.remaining = this.totalSeconds
      }
      saveSettings({workMinutes: this.workMin, breakMinutes: this.breakMin});
    },
  },

  methods: {
    tick() {
      if (this.remaining > 0) {
        this.remaining -= 1
      } else {
        if (this.phase === "work") {
          this.completed++
          notifyBreakStart();
          chime.play();
          this.phase = "break"
        } else {
          chime.play();
          notifyWorkStart();
          this.phase = "work"
        }
        this.remaining = this.totalSeconds
      }
    },
    start() {
      if (this.running) return
      this.running = true
      this.timerId = setInterval(this.tick, 1000)
    },
    pause() {
      this.running = false
      if (this.timerId) {
        clearInterval(this.timerId)
        this.timerId = null
      }
    },
    toggle() {
      this.running ? this.pause() : this.start()
    },
    reset() {
      this.pause()
      this.remaining = this.totalSeconds
    },
    skip() {
      if (this.phase === "work") {
        this.completed++
        this.phase = "break"
      } else {
        this.phase = "work"
      }
      this.remaining = this.totalSeconds
    },
  },

  mounted() {
    this.remaining = this.totalSeconds
  },

  beforeUnmount() {
    this.pause()
  },
}

</script>

<style lang="scss" scoped>
/* Theme tokens */
$bg: #0e0f12;
$panel: #16181d;
$muted: #a6acb8;
$text: #e8ebf0;
$primary: #5b9cff;
$primary-weak: rgba($primary, 0.18);
$success: #22c55e;
$warning: #f59e0b;
$ring: rgba(255,255,255,0.07);

.pomodoro {
  max-width: 580px;
  margin: 8vh auto;
  background: $panel;
  border: 1px solid $ring;
  border-radius: 16px;
  padding: 24px 22px 18px;
  color: $text;
  box-shadow: 0 20px 50px rgba(0,0,0,0.35);

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  &__title {
    font-weight: 700;
    letter-spacing: .3px;
    font-size: 22px;
    margin: 0;
  }

  &__phase {
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: .08em;
    border: 1px solid $ring;
    &.is-work { background: $primary-weak; color: $text; }
    &.is-break { background: rgba($success, .18); color: $text; }
  }

  &__timer {
    text-align: center;
    margin: 16px 0 10px;
  }

  &__time {
    font-variant-numeric: tabular-nums;
    font-size: 64px;
    line-height: 1;
    letter-spacing: 1px;
  }

  &__seconds {
    opacity: .9;
  }

  &__progress {
    margin: 18px auto 0;
    height: 8px;
    border-radius: 999px;
    background: #0f1116;
    border: 1px solid $ring;
    overflow: hidden;

    .pomodoro__bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, $primary, lighten($primary, 10%));
      transition: width .25s linear;
    }
  }

  &__controls {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin: 18px 0 10px;
  }

  &__footer {
    margin-top: 10px;
    padding-top: 12px;
    border-top: 1px dashed $ring;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
  }

  &__stat {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  &__label {
    color: $muted;
    font-size: 12px;
  }

  &__value {
    font-size: 18px;
  }

  &__settings {
    display: flex;
    gap: 14px;
    label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: $muted;
      font-size: 12px;

      input {
        width: 60px;
        padding: 6px 8px;
        border-radius: 8px;
        border: 1px solid $ring;
        background: $bg;
        color: $text;
        outline: none;

        &:focus {
          border-color: $primary;
          box-shadow: 0 0 0 3px $primary-weak;
        }
      }
    }
  }
}

/* Buttons */
.btn {
  appearance: none;
  border: 1px solid transparent;
  background: $primary;
  color: white;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: transform .02s ease, box-shadow .2s ease, opacity .2s ease;

  &:hover { box-shadow: 0 6px 18px rgba($primary, .35); }
  &:active { transform: translateY(1px); }
}

.btn--ghost {
  background: transparent;
  color: $text;
  border-color: $ring;

  &:hover { background: rgba(255,255,255,0.03); }
}
</style>
