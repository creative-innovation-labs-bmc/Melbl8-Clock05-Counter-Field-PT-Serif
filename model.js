(() => {
  'use strict';

  const CF = window.CounterField;
  const c = CF.constants;
  const options = CF.options;

  const runtime = {
    lastClockString: '',
    lastColonSecond: -1,
    minutePulseStart: -Infinity,
    demoStart: performance.now(),
    demoBase: Date.now()
  };

  const digitLayout = CF.buildDigitLayout();
  const digitCells = buildDigitCells(digitLayout);
  const colonCells = buildColonCells(digitLayout);
  const backgroundCells = buildBackgroundCells();

  function buildDigitCells(layout) {
    const random = CF.seededRandom(804384005);
    const cells = [];
    let digitIndex = 0;

    for (const item of layout) {
      if (item.type !== 'digit') continue;

      for (let row = 0; row < c.DIGIT_ROWS; row++) {
        for (let col = 0; col < c.DIGIT_COLS; col++) {
          const initial = Math.floor(random() * 10);
          cells.push({
            digitIndex,
            row,
            col,
            x: item.x + col * c.CELL_X,
            y: c.CLOCK_Y + row * c.CELL_Y,
            ambientValue: initial,
            currentValue: initial,
            sourceValue: initial,
            targetValue: initial,
            active: false,
            settleAt: -Infinity,
            nextAmbientChange: random() * 900,
            phase: random() * Math.PI * 2,
            jitter: (random() - 0.5) * 0.65
          });
        }
      }
      digitIndex++;
    }

    return cells;
  }

  function buildColonCells(layout) {
    const cells = [];
    const colonItems = layout.filter((item) => item.type === 'colon');

    colonItems.forEach((item) => {
      [4, 10].forEach((startRow) => {
        for (let rowOffset = 0; rowOffset < 3; rowOffset++) {
          for (let colOffset = 0; colOffset < 3; colOffset++) {
            cells.push({
              x: item.x + colOffset * c.CELL_X,
              y: c.CLOCK_Y + (startRow + rowOffset) * c.CELL_Y,
              rowOffset,
              colOffset,
              value: 0,
              targetValue: 0,
              settleAt: -Infinity
            });
          }
        }
      });
    });

    return cells;
  }

  function buildBackgroundCells() {
    const random = CF.seededRandom(37313605);
    const cells = [];
    const cols = 56;
    const rows = 11;
    const xStep = c.LOGICAL_W / (cols - 1);
    const yStart = 54;
    const yStep = 25;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({
          x: col * xStep + (random() - 0.5) * 5,
          y: yStart + row * yStep + (random() - 0.5) * 4,
          value: Math.floor(random() * 10),
          phase: random() * Math.PI * 2,
          speed: 0.25 + random() * 0.55,
          nextChange: random() * 4000,
          opacity: 0.035 + random() * 0.045
        });
      }
    }

    return cells;
  }

  function getNow(nowPerf) {
    if (options.fixedTime) return new Date();
    if (options.demoMode) {
      return new Date(runtime.demoBase + (nowPerf - runtime.demoStart) * 8);
    }
    return new Date();
  }

  function getClockState(date) {
    let values;

    if (options.fixedTime) {
      values = {
        hour: String(options.fixedTime.hour).padStart(2, '0'),
        minute: String(options.fixedTime.minute).padStart(2, '0'),
        second: String(options.fixedTime.second).padStart(2, '0')
      };
    } else {
      const parts = CF.timeFormatter.formatToParts(date);
      values = Object.fromEntries(
        parts
          .filter((part) => part.type !== 'literal')
          .map((part) => [part.type, part.value])
      );
    }

    const clock = `${values.hour}${values.minute}${values.second}`;
    const minuteProgressMs = options.fixedTime
      ? options.fixedTime.second * 1000
      : date.getSeconds() * 1000 + date.getMilliseconds();

    return {
      clock,
      hour: Number(values.hour),
      minute: Number(values.minute),
      second: Number(values.second),
      label: CF.dayFormatter.format(date).toUpperCase().replace(',', ''),
      minuteProgressMs,
      logicalMs: date.getTime(),
      millisecond: options.fixedTime ? 0 : date.getMilliseconds()
    };
  }

  function formatClock(date) {
    const parts = CF.timeFormatter.formatToParts(date);
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value])
    );
    return `${values.hour}${values.minute}${values.second}`;
  }

  function maskForDigit(digit, col, row) {
    const mask = CF.digitMasks[digit] || CF.digitMasks['0'];
    return mask[row][col] === '#';
  }

  function elapsedSinceDigitChange(index, state) {
    const withinMinute = state.second * 1000 + state.millisecond;

    switch (index) {
      case 5: return state.millisecond;
      case 4: return (state.second % 10) * 1000 + state.millisecond;
      case 3: return withinMinute;
      case 2: return (state.minute % 10) * 60000 + withinMinute;
      case 1: return state.minute * 60000 + withinMinute;
      case 0: {
        const blockStartHour = state.hour >= 20 ? 20 : state.hour >= 10 ? 10 : 0;
        return (state.hour - blockStartHour) * 3600000 +
          state.minute * 60000 + withinMinute;
      }
      default: return 0;
    }
  }

  function intervalForDigit(index, state) {
    switch (index) {
      case 5: return 1000;
      case 4: return 10000;
      case 3: return 60000;
      case 2: return 600000;
      case 1: return 3600000;
      case 0: {
        const currentTens = Math.floor(state.hour / 10);
        for (let hoursAhead = 1; hoursAhead <= 24; hoursAhead++) {
          const futureHour = (state.hour + hoursAhead) % 24;
          if (Math.floor(futureHour / 10) !== currentTens) {
            return hoursAhead * 3600000;
          }
        }
        return 36000000;
      }
      default: return 1000;
    }
  }

  function initialiseDigitPhase(index, targetDigit, state) {
    const cells = digitCells.filter((cell) => cell.digitIndex === index);
    const elapsed = elapsedSinceDigitChange(index, state);
    const changeLogicalMs = state.logicalMs - elapsed;
    const previousClock = formatClock(new Date(changeLogicalMs - 1));
    const previousDigit = previousClock[index];
    const activeCells = [];

    for (const cell of cells) {
      const becomesActive = maskForDigit(targetDigit, cell.col, cell.row);
      const wasPreviouslyActive = maskForDigit(previousDigit, cell.col, cell.row);
      cell.active = becomesActive;
      if (!becomesActive) continue;

      cell.sourceValue = wasPreviouslyActive
        ? Number(previousDigit)
        : cell.ambientValue;
      cell.targetValue = Number(targetDigit);
      activeCells.push(cell);
    }

    activeCells.sort((a, b) => a.row - b.row || a.col - b.col);
    const settleDuration = intervalForDigit(index, state) * 0.5;
    const denominator = Math.max(1, activeCells.length - 1);

    activeCells.forEach((cell, rank) => {
      cell.settleAt = changeLogicalMs + settleDuration * (rank / denominator);
      cell.currentValue = state.logicalMs >= cell.settleAt
        ? cell.targetValue
        : cell.sourceValue;
    });
  }

  function beginDigitTransition(index, targetDigit, state, instantly) {
    const cells = digitCells.filter((cell) => cell.digitIndex === index);
    const activeCells = [];

    for (const cell of cells) {
      const becomesActive = maskForDigit(targetDigit, cell.col, cell.row);

      if (becomesActive) {
        cell.sourceValue = cell.active
          ? cell.currentValue
          : cell.ambientValue;
        cell.targetValue = Number(targetDigit);
        activeCells.push(cell);
      }

      cell.active = becomesActive;
    }

    activeCells.sort((a, b) => a.row - b.row || a.col - b.col);

    if (instantly || options.noMotion) {
      for (const cell of activeCells) {
        cell.currentValue = cell.targetValue;
        cell.settleAt = -Infinity;
      }
      return;
    }

    const settleDuration = intervalForDigit(index, state) * 0.5;
    const denominator = Math.max(1, activeCells.length - 1);

    activeCells.forEach((cell, rank) => {
      cell.currentValue = cell.sourceValue;
      cell.settleAt = state.logicalMs + settleDuration * (rank / denominator);
    });
  }

  function updateColon(state) {
    if (state.second !== runtime.lastColonSecond) {
      const targetValue = state.second % 10;
      const firstFrame = runtime.lastColonSecond < 0;
      runtime.lastColonSecond = state.second;
      const transitionStart = state.logicalMs - state.millisecond;

      for (const cell of colonCells) {
        if (firstFrame) cell.value = (targetValue + 9) % 10;
        cell.targetValue = targetValue;
        const rank = cell.rowOffset * 3 + cell.colOffset;
        cell.settleAt = options.noMotion
          ? transitionStart
          : transitionStart + rank * (520 / 8);
      }
    }

    for (const cell of colonCells) {
      if (state.logicalMs >= cell.settleAt) {
        cell.value = cell.targetValue;
      }
    }
  }

  function updateCells(state, nowPerf) {
    const firstState = !runtime.lastClockString;

    if (state.clock !== runtime.lastClockString) {
      for (let index = 0; index < state.clock.length; index++) {
        if (firstState) {
          if (options.fixedTime || options.noMotion) {
            beginDigitTransition(index, state.clock[index], state, true);
          } else {
            initialiseDigitPhase(index, state.clock[index], state);
          }
        } else if (state.clock[index] !== runtime.lastClockString[index]) {
          beginDigitTransition(index, state.clock[index], state, false);
        }
      }

      if (!firstState &&
          state.clock.slice(0, 4) !== runtime.lastClockString.slice(0, 4)) {
        runtime.minutePulseStart = nowPerf;
      }

      runtime.lastClockString = state.clock;
    }

    for (const cell of digitCells) {
      if (cell.active && state.logicalMs >= cell.settleAt) {
        cell.currentValue = cell.targetValue;
      }

      if (!cell.active && nowPerf >= cell.nextAmbientChange) {
        cell.ambientValue =
          (cell.ambientValue + 1 + ((cell.row + cell.col) % 3)) % 10;
        cell.currentValue = cell.ambientValue;
        cell.nextAmbientChange =
          nowPerf + 560 + ((cell.row * 47 + cell.col * 83) % 720);
      }
    }

    updateColon(state);

    for (const cell of backgroundCells) {
      if (nowPerf >= cell.nextChange) {
        cell.value = (cell.value + 1 + (Math.floor(cell.x) % 4)) % 10;
        cell.nextChange =
          nowPerf + 1200 + ((Math.floor(cell.x + cell.y) * 17) % 3200);
      }
    }
  }

  Object.assign(CF, {
    runtime,
    digitLayout,
    digitCells,
    colonCells,
    backgroundCells,
    getNow,
    getClockState,
    updateCells
  });
})();
