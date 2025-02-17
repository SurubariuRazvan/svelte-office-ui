import {
  eachDayOfInterval,
  endOfMonth,
  isBefore,
  isSameDay,
  startOfMonth,
  isWeekend,
} from 'date-fns';
import { derived, Readable } from 'svelte/store';
import {
  currentMonthState,
  enteringMode,
  loadingLogs,
  logEntries,
  logEntriesAreLoading,
  selectedLogs,
  importinfo,
  typesOfWork,
  displayWeekend,
  favoritesTasks,
} from './state';

export const getDaysRange = derived(
  [currentMonthState, displayWeekend],
  ([month, includeWeekends]) => {
    const start = startOfMonth(month);
    const end = endOfMonth(start);
    if (!includeWeekends) {
      return eachDayOfInterval({ start, end }).filter((day) => !isWeekend(day));
    }
    return eachDayOfInterval({ start, end });
  },
);

export const getDisplayedDateRange = derived(currentMonthState, (month) => {
  return {
    startDate: startOfMonth(month),
    endDate: endOfMonth(month),
  };
});

export function getLogInfo(taskId: number, date: Date) {
  return derived(logEntries, (entries) => {
    const log = entries.find(
      (e) => e.taskId === taskId && isSameDay(e.date, date),
    );
    return log;
  });
}

export function getTotalHoursForDay(date: Date) {
  return derived(logEntries, (entries) => {
    const logs = entries.filter((e) => isSameDay(e.date, date));

    return logs.reduce((sum, log) => {
      return sum + log.hours;
    }, 0);
  });
}

export function getIsWorkFromHome(date: Date): Readable<boolean | null> {
  return derived(logEntries, (entries) => {
    const logs = entries.filter((e) => isSameDay(e.date, date));
    const isAnyFromHome = logs.find((l) => l.isWorkFromHome);
    const isAnyFromOffice = logs.find((l) => !l.isWorkFromHome);
    if (isAnyFromHome && isAnyFromOffice) {
      return null;
    }

    return isAnyFromHome !== undefined;
  });
}

export function getTotalHoursForTask(taskId: number) {
  return derived(logEntries, (entries) => {
    const logs = entries.filter((e) => e.taskId === taskId);

    return logs.reduce((sum, log) => {
      return sum + log.hours;
    }, 0);
  });
}

export const getTotalForMonthNeeded = derived(currentMonthState, (month) => {
  const start = startOfMonth(month);
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end });
  const weekDays = allDays.filter((day) => !isWeekend(day));

  // TODO: Where do we get the required number of hours from?
  return weekDays.length * 8;
});

export const getTotalForMonth = derived(logEntries, (entries) => {
  return entries.reduce((sum, log) => {
    return sum + log.hours;
  }, 0);
});

export function isLogSelected(taskId: number, date: Date) {
  return derived(selectedLogs, (logs) => {
    return (
      logs.find(
        (l) =>
          l.taskId === taskId &&
          isSameDay(date, l.day) &&
          l.status === 'selected',
      ) !== undefined
    );
  });
}

export function isLogImported(taskId: number, date: Date) {
  return derived(selectedLogs, (logs) => {
    return (
      logs.find(
        (l) =>
          l.taskId === taskId &&
          isSameDay(date, l.day) &&
          l.status === 'imported',
      ) !== undefined
    );
  });
}

export function isLogUpdated(taskId: number, date: Date) {
  return derived(selectedLogs, (logs) => {
    return (
      logs.find(
        (l) =>
          l.taskId === taskId &&
          isSameDay(date, l.day) &&
          l.status === 'updated',
      ) !== undefined
    );
  });
}

export const isAnyOfTheLogLoading = derived(loadingLogs, (logs) => {
  return logs.length > 0;
});

export function isLogLoading(taskId: number, date: Date) {
  return derived(loadingLogs, (logs) => {
    return (
      logs.find((l) => l.taskId === taskId && isSameDay(date, l.day)) !==
      undefined
    );
  });
}

export function isLogInvalid(taskId: number, date: Date) {
  return derived(logEntries, (entries) => {
    if (taskId === 193 || taskId === 194) return false;

    const logsInTheDay = entries.filter((e) => isSameDay(e.date, date));
    const logForTheTask = logsInTheDay.find((l) => l.taskId === taskId);
    if (!logForTheTask) return false;

    const hasHoliday = logsInTheDay.some(
      (e) => e.taskId === 193 || e.taskId == 194,
    );

    return hasHoliday;
  });
}

export const isGridReadOnly = derived(currentMonthState, (month) => {
  return isBefore(month, startOfMonth(new Date()));
});

export const hintMessage = derived(
  [
    currentMonthState,
    logEntriesAreLoading,
    selectedLogs,
    loadingLogs,
    enteringMode,
  ],
  ([month, logsAreLoading, selected, loading, mode]) => {
    if (logsAreLoading) {
      return 'Loading data. Please wait.';
    }

    if (loading.length > 0) {
      if (loading.length < 5) {
        return 'Data is saving. Please wait.';
      } else {
        return `${loading.length} entries are updating. This might take a while, so hold on!`;
      }
    }

    if (mode === 'hours') {
      return `You are editing ${selected.length} entries. Hit ENTER to submit or ESC to cancel. Use value 0 to delete the entry`;
    }

    if (selected.length == 1) {
      return 'Hit CTRL+ENTER to edit. Or hold CTRL (or CMD) and click on other cells to select more. Or hold SHIFT and click on other cell to select the range of dates';
    } else if (selected.length > 1) {
      return `${selected.length} days selected. Hit CTRL+ENTER to edit or ESC to cancel`;
    }

    if (isBefore(month, startOfMonth(new Date()))) {
      return 'You are not allowed to change data in the past, but you can look at it and be proud of your work!';
    }

    return 'Double click on a cell to edit. Use value 0 to delete the entry';
  },
);

export const hasImportedData = derived(selectedLogs, (selections) =>
  selections.some(
    (select) => select.status === 'imported' || select.status === 'updated',
  ),
);

export const getSelected = derived(selectedLogs, (logs) =>
  logs.filter((log) => log.status === 'selected'),
);

export const getImported = derived(selectedLogs, (logs) =>
  logs.filter((log) => log.status === 'imported'),
);

export const importedEntries = derived(
  [getImported, logEntries],
  ([imported, allEntries]) =>
    allEntries.filter((entry) =>
      imported.some(
        (imported) =>
          imported.taskId === entry.taskId &&
          isSameDay(imported.day, entry.date),
      ),
    ),
);

export const isImportMetadataReady = derived(importinfo, (info) =>
  info &&
  info.isWorkFromHome !== undefined &&
  info.selectedTypeOfWorkIndex !== undefined &&
  info.isWorkFromHome
    ? info.workFromHomeStart !== undefined
    : true,
);

export const selectedTypeOfWorkKeyForImport = derived(
  [importinfo, typesOfWork],
  ([importinfo, typesOfWork]) => {
    const DEFAULT_TYPE_OF_WORK = 'PROG';
    if ((typesOfWork?.length ?? 0) < 1) return DEFAULT_TYPE_OF_WORK;
    if ((importinfo?.selectedTypeOfWorkIndex ?? undefined) === undefined) {
      return DEFAULT_TYPE_OF_WORK;
    }

    if (importinfo.selectedTypeOfWorkIndex > typesOfWork.length - 1) {
      return DEFAULT_TYPE_OF_WORK;
    }

    return (
      typesOfWork[importinfo.selectedTypeOfWorkIndex]?.key ??
      DEFAULT_TYPE_OF_WORK
    );
  },
);

export const affectedLogsDuringImport = derived(selectedLogs, (logs) =>
  logs?.filter((log) => log.status === 'imported' || log.status === 'updated'),
);

export const affectedEntriesDuringImport = derived(
  [affectedLogsDuringImport, logEntries],
  ([logs, entries]) => {
    const updated = entries.filter((entry) =>
      logs.some(
        (imported) =>
          imported.taskId === entry.taskId &&
          isSameDay(imported.day, entry.date),
      ),
    );
    return updated;
  },
);

export const favoriteTasksIds = derived(favoritesTasks, (favoritesTasks) => {
  return favoritesTasks.map((task) => task.taskNumber);
});

export function isTaskFavorite(taskId: number) {
  return derived(favoriteTasksIds, (ids) => {
    return ids.includes(taskId);
  });
}
