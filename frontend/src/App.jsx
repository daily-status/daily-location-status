import { useEffect, useMemo, useState } from "react";

import {
  createLocation,
  deleteLocation,
  fetchLocations,
  importLocationsFromExcel,
} from "./api/locations.ts";

import {
  createReport,
  deleteReport,
  fetchReports,
  updateReport,
} from "./api/reports.ts";

import { getTodayString } from "./api/helpers.ts";
import {
  createUser,
  deleteUser,
  fetchUsers,
  importUsersFromExcel,
  updateUser,
} from "./api/users.ts";
import AppToolbar from "./components/AppToolbar";
import PersonTable from "./components/PersonTable";
import UserEditModal from "./components/UserEditModal";
import UserHistoryModal from "./components/UserHistoryModal";
import {
  uniqueLocations
} from "./constants/locations.ts";

import {
  DAILY_STATUS_BAD,
  DAILY_STATUS_MISSING,
  DAILY_STATUS_OK,
} from "./constants/statuses.ts";

import { toUtcIsoFromLocalInput } from "./utils/dates.ts";

import { getErrorMessage } from "./utils/errors.ts";

const REPORTS_UNAVAILABLE_MESSAGE = "לא קיימים דוחות לתאריך שנבחר.";
export const MIN_DATE = "2026-03-20";

const normalizeLocationName = (value) => String(value || "").trim();

const getReportLocalDate = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }

  const year = String(parsed.getFullYear());
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLatestReportForUser = (reports, userId) =>
  reports
    .filter((report) => Number(report?.userId) === Number(userId))
    .sort(
      (left, right) =>
        new Date(right?.occurredAt || 0).getTime() -
        new Date(left?.occurredAt || 0).getTime()
    )[0];

const mapReportStatusToDailyStatus = (isStatusOk) => {
  if (isStatusOk === true) {
    return DAILY_STATUS_OK;
  }

  if (isStatusOk === false) {
    return DAILY_STATUS_BAD;
  }

  return DAILY_STATUS_MISSING;
};

const mapDailyStatusToReportStatus = (dailyStatus) => {
  if (dailyStatus === DAILY_STATUS_OK) {
    return true;
  }

  if (dailyStatus === DAILY_STATUS_BAD) {
    return false;
  }

  return null;
};

const buildAvailableDates = (reports, todayString, selectedDate) => {
  const allDates = Array.isArray(reports)
    ? reports
        .map((report) => getReportLocalDate(report?.occurredAt))
        .filter(Boolean)
    : [];

  return Array.from(new Set([todayString, selectedDate, ...allDates]))
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left));
};

const formatBackupLastUpdated = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
};

function App() {
  const todayString = getTodayString();

  // State Management
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [locations, setLocations] = useState([]);
  const [backupFiles, setBackupFiles] = useState([]);
  const [selectedBackupDate, setSelectedBackupDate] = useState(todayString);
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [availableDates, setAvailableDates] = useState([todayString]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [backupRendering, setBackupRendering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filter & Form States
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newLocationName, setNewLocationName] = useState("");
  const [locationToDelete, setLocationToDelete] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [editingPerson, setEditingPerson] = useState(null);
  const [editUserFullName, setEditUserFullName] = useState("");
  const [editUserPhone, setEditUserPhone] = useState("");
  const [historyPerson, setHistoryPerson] = useState(null);
  const [historyReports, setHistoryReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySaving, setHistorySaving] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [draftReport, setDraftReport] = useState({
    locationName: "",
    status: DAILY_STATUS_OK,
    occurredAt: "",
  });
  const [downloadFromDate, setDownloadFromDate] = useState(todayString);
  const [downloadToDate, setDownloadToDate] = useState(todayString);

  const isReadOnly = selectedDate !== todayString;

  // Logic: Memoized Data Transformations
  const locationOptions = useMemo(() => {
    const apiNames = locations.map((l) => l.name);
    return uniqueLocations(apiNames);
  }, [locations]);

  const deletableLocationOptions = useMemo(() => locationOptions,[locationOptions]);

  const locationNameById = useMemo(
    () => new Map(locations.map((l) => [Number(l.id), String(l.name || "")])),
    [locations]
  );

  // FIX: Added missing locationIdByName map (reverse of locationNameById)
  const locationIdByName = useMemo(
    () =>
      new Map(
        locations.map((l) => [String(l.name || "").trim(), Number(l.id)])
      ),
    [locations]
  );

  const people = useMemo(() => {
    return users.map((user) => {
      // MODERN APPROACH: Filter then toSorted() to find the latest report
      const latest = reports
      .filter((r) => Number(r?.userId) === Number(user.id))
      .toSorted((a, b) => 
        new Date(b?.occurredAt || 0).getTime() - new Date(a?.occurredAt || 0).getTime()
      )[0];

      return {
        person_id: String(user.id),
        full_name: String(user.fullName || ""),
        location: locationNameById.get(Number(latest?.locationId)) || (latest ? String(latest.locationId) : ""),
        daily_status: latest?.isStatusOk === true ? DAILY_STATUS_OK :
                      latest?.isStatusOk === false ? DAILY_STATUS_BAD : DAILY_STATUS_MISSING,
        phone: user.phone ? String(user.phone) : "",
        last_updated: latest?.occurredAt || "",
      };
    });
  }, [locationNameById, reports, users]);

  const filteredPeople = useMemo(() => {
    return people
      .filter((p) => {
        if (searchTerm && !p.full_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (locationFilter !== "all" && p.location !== locationFilter) return false;
        if (statusFilter !== "all" && p.daily_status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "he"));
  }, [locationFilter, people, searchTerm, statusFilter]);

  const canDownloadSelectedDate = Boolean(selectedDate) && !loading && !actionLoading;
  const canAddLocation = !actionLoading;
  const canAddUser =
    !actionLoading &&
    Boolean(String(newUserFullName).trim()) &&
    Boolean(String(newUserPhone).trim());
  const canChooseLocationToDelete =
    deletableLocationOptions.length > 0 && !actionLoading;
  const canDeleteLocation =
    !actionLoading && deletableLocationOptions.length > 0 && Boolean(locationToDelete);
  const selectedBackup = useMemo(
    () => backupFiles.find((backup) => backup?.date === selectedBackupDate) || null,
    [backupFiles, selectedBackupDate]
  );

  // Effects: Initial Data Load
  useEffect(() => {
    void refreshData(todayString);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshData(selectedDate, { silent: true });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [selectedDate, historyPerson, locationNameById, todayString]);

  useEffect(() => {
    if (deletableLocationOptions.length === 0) {
      setLocationToDelete("");
      return;
    }

    if (!deletableLocationOptions.includes(locationToDelete)) {
      setLocationToDelete("");
    }
  }, [deletableLocationOptions, locationToDelete]);

  // --- API Actions ---

  async function loadDashboard(dateValue, options = {}) {
    const { silent = false } = options;

    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const [u, l, allR, dateR] = await Promise.all([
        fetchUsers(),
        fetchLocations(),
        fetchReports(),
        fetchReports({ date: dateValue }),
      ]);
      setUsers(u || []);
      setLocations(l || []);
      setReports(dateR || []);
      setSelectedDate(dateValue);

      const historyDates = Array.isArray(allR) ? allR.map(r => r.occurredAt?.slice(0, 10)) : [];
      setAvailableDates(Array.from(new Set([todayString, dateValue, ...historyDates]))
        .filter(Boolean).sort((a, b) => b.localeCompare(a)));
    } catch (err) {
      if (!silent) {
        setError(getErrorMessage(err, "טעינת הנתונים נכשלה"));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function loadBackupFiles() {
    try {
      const res = await fetch("/api/reports/backup/list");
      if (res.ok) {
        const data = await res.json();
        const nextBackups = Array.isArray(data) ? data : [];
        setBackupFiles(nextBackups);

        if (nextBackups.some((backup) => backup?.date === todayString)) {
          setSelectedBackupDate(todayString);
        } else if (nextBackups[0]?.date) {
          setSelectedBackupDate(nextBackups[0].date);
        }
      }
    } catch (err) {
      // Silently ignore — backup service may not be running
    }
  }

  async function refreshData(dateValue = selectedDate, options = {}) {
    const { silent = false } = options;

    if (!silent) {
      setRefreshing(true);
    }

    try {
      await Promise.all([
        loadDashboard(dateValue, { silent }),
        loadBackupFiles(),
        historyPerson ? loadHistoryReports(historyPerson) : Promise.resolve(),
      ]);
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  }

  // FIX: Added missing handleLoadSelectedDate
  async function handleLoadSelectedDate(dateValue) {
    if (!dateValue) return;
    await refreshData(dateValue);
  }

  // FIX: Added missing handleDownloadDayFile
  function handleDownloadDayFile() {
    if (!selectedDate) return;
    const url = `/api/reports/export?minDate=${selectedDate}T00:00:00.000Z&maxDate=${selectedDate}T23:59:59.999Z`;
    triggerFileDownload(url, `report_${selectedDate}.xlsx`);
  }

  // FIX: Added missing handleEditPerson
  function handleEditPerson(person) {
    setEditingPerson(person);
    setEditUserFullName(person?.full_name || "");
    setEditUserPhone(person?.phone || "");
  }

  function triggerFileDownload(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    if (filename) {
      link.download = filename;
    }
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleBackupDownload(fileName) {
    const url = `/api/reports/backup/download/${encodeURIComponent(fileName)}?t=${Date.now()}`;
    triggerFileDownload(url, fileName);
  }

  async function handleRenderBackupNow() {
    setBackupRendering(true);
    setError("");

    try {
      const res = await fetch("/api/reports/backup", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Backup render failed");
      }

      await loadBackupFiles();
    } catch (err) {
      setError(getErrorMessage(err, "יצירת קובץ הגיבוי נכשלה"));
    } finally {
      setBackupRendering(false);
    }
  }

  async function handleDownloadRangeFiles() {
    const url = `/api/reports/export?minDate=${downloadFromDate}T00:00:00.000Z&maxDate=${downloadToDate}T23:59:59.999Z`;
    triggerFileDownload(url, `report_${downloadFromDate}_to_${downloadToDate}.xlsx`);
  }

  async function handleAddLocation() {
    if (!canAddLocation) return;
    setActionLoading(true);
    try {
      await createLocation(newLocationName);
      setNewLocationName("");
      await loadDashboard(selectedDate);
    } catch (err) {
      const message = String(err?.message || "");
      if (message.toLowerCase().includes("already exists")) {
        setError("המיקום הזה כבר קיים במערכת.");
      } else {
        setError("הוספת מיקום נכשלה");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteLocation() {
    if (!canDeleteLocation) return;
    const target = locations.find(l => l.name === locationToDelete);
    if (!target) return;
    setActionLoading(true);
    try {
      await deleteLocation(target.id);
      setLocationToDelete("");
      await loadDashboard(selectedDate);
    } catch (err) {
      setError("מחיקת מיקום נכשלה");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddUser() {
    const fullName = String(newUserFullName || "").trim();
    const phone = String(newUserPhone || "").trim();

    if (!fullName || !phone) {
      setError("יש להזין שם מלא וטלפון לפני הוספת משתמש");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await createUser({ fullName, phone });
      setNewUserFullName("");
      setNewUserPhone("");
      await loadDashboard(selectedDate);
    } catch (err) {
      setError(getErrorMessage(err, "הוספת משתמש נכשלה"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateUser() {
    const userId = Number(editingPerson?.person_id);
    const fullName = String(editUserFullName || "").trim();
    const phone = String(editUserPhone || "").trim();

    if (!userId || !fullName || !phone) {
      setError("יש לבחור משתמש ולהזין שם מלא וטלפון");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await updateUser(userId, {
        id: userId,
        fullName,
        phone,
      });
      setEditingPerson(null);
      await loadDashboard(selectedDate);
    } catch (err) {
      setError(getErrorMessage(err, "עדכון משתמש נכשל"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteUser() {
    const userId = Number(editingPerson?.person_id);
    const fullName = String(editingPerson?.full_name || "");

    if (!userId) {
      return;
    }

    const approved = window.confirm(`למחוק את המשתמש "${fullName}"?`);
    if (!approved) {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await deleteUser(userId);
      setEditingPerson(null);
      await loadDashboard(selectedDate);
    } catch (err) {
      setError(getErrorMessage(err, "מחיקת משתמש נכשלה"));
    } finally {
      setActionLoading(false);
    }
  }

  function normalizeHistoryReports(rawReports) {
    return rawReports
      .slice()
      .sort(
        (left, right) =>
          new Date(right?.occurredAt || 0).getTime() -
          new Date(left?.occurredAt || 0).getTime()
      )
      .map((report) => ({
        ...report,
        createdAt: report.createdAt || report.occurredAt,
        source: report.source || "ui",
        isEditable: getReportLocalDate(report.occurredAt) === todayString,
        locationName:
          locationNameById.get(Number(report.locationId)) ||
          String(report.locationId || ""),
      }));
  }

  function resetDraftReport(defaultLocationName = "") {
    setDraftReport({
      locationName: defaultLocationName,
      status: DAILY_STATUS_OK,
      occurredAt: "",
    });
  }

  async function loadHistoryReports(person) {
    const userId = Number(person?.person_id);
    if (!userId) {
      return;
    }

    const reportsResponse = await fetchReports({ userId });
    const safeReports = Array.isArray(reportsResponse) ? reportsResponse : [];
    setHistoryReports(normalizeHistoryReports(safeReports));
  }

  async function handleOpenHistory(person) {
    setHistoryPerson(person);
    setHistoryReports([]);
    setHistoryLoading(true);
    setDeletingReportId(null);
    setError("");
    resetDraftReport(person?.location || locations[0]?.name || "");

    try {
      await loadHistoryReports(person);
    } catch (err) {
      setError(getErrorMessage(err, "טעינת היסטוריית המשתמש נכשלה"));
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleDraftReportChange(key, value) {
    if (key === "locationName" || key === "status" || key === "occurredAt") {
      setDraftReport((current) => ({
        ...current,
        [key]: value,
      }));
      return;
    }

    if (!key.startsWith("report:")) {
      return;
    }

    const [, reportId, field] = key.split(":");
    setHistoryReports((current) =>
      current.map((report) => {
        if (String(report.id) !== String(reportId)) {
          return report;
        }

        if (field === "locationName") {
          return { ...report, locationName: value };
        }

        if (field === "status") {
          return {
            ...report,
            isStatusOk: mapDailyStatusToReportStatus(value),
          };
        }

        if (field === "occurredAt") {
          return {
            ...report,
            occurredAt: value,
          };
        }

        return report;
      })
    );
  }

  async function handleAddHistoryReport() {
    const userId = Number(historyPerson?.person_id);
    const locationId = locationIdByName.get(String(draftReport.locationName || "").trim());
    const occurredAt = toUtcIsoFromLocalInput(draftReport.occurredAt);

    if (!userId || !locationId || !occurredAt) {
      setError("יש לבחור מיקום, סטטוס ותאריך תקינים לפני הוספת דיווח");
      return;
    }

    setHistorySaving(true);
    setError("");

    try {
      await createReport({
        userId,
        locationId,
        isStatusOk: mapDailyStatusToReportStatus(draftReport.status),
        occurredAt,
        source: "ui",
      });
      await loadHistoryReports(historyPerson);
      await loadDashboard(selectedDate);
      resetDraftReport(historyPerson?.location || locations[0]?.name || "");
    } catch (err) {
      setError(getErrorMessage(err, "הוספת דיווח נכשלה"));
    } finally {
      setHistorySaving(false);
    }
  }

  async function handleUpdateHistoryReport(reportId) {
    const report = historyReports.find((item) => Number(item.id) === Number(reportId));
    const locationId = locationIdByName.get(String(report?.locationName || "").trim());
    const occurredAt = toUtcIsoFromLocalInput(report?.occurredAt || "");

    if (!report || !locationId || !occurredAt) {
      setError("יש לבחור מיקום ותאריך תקינים לפני שמירה");
      return;
    }

    setHistorySaving(true);
    setError("");

    try {
      await updateReport(Number(reportId), {
        userId: Number(historyPerson?.person_id),
        locationId,
        isStatusOk: report.isStatusOk,
        occurredAt,
        source: report.source || "ui",
      });
      await loadHistoryReports(historyPerson);
      await loadDashboard(selectedDate);
    } catch (err) {
      setError(getErrorMessage(err, "עדכון דיווח נכשל"));
    } finally {
      setHistorySaving(false);
    }
  }

  async function handleDeleteHistoryReport(reportId) {
    const approved = window.confirm("למחוק את הדיווח שנבחר?");
    if (!approved) {
      return;
    }

    setDeletingReportId(reportId);
    setError("");

    try {
      await deleteReport(Number(reportId));
      await loadHistoryReports(historyPerson);
      await loadDashboard(selectedDate);
    } catch (err) {
      setError(getErrorMessage(err, "מחיקת דיווח נכשלה"));
    } finally {
      setDeletingReportId(null);
    }
  }

  async function handleImportUsersFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await importUsersFromExcel(file);
      await loadDashboard(selectedDate);
    } catch (err) {
      setError(getErrorMessage(err, "ייבוא משתמשים מאקסל נכשל"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleImportLocationsFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await importLocationsFromExcel(file);
      await loadDashboard(selectedDate);
    } catch (err) {
      setError(getErrorMessage(err, "ייבוא מיקומים מאקסל נכשל"));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="app-shell" dir="rtl">
      <header className="header-card">
        <div>
          <h1>ניהול סטטוס יומי ומיקום</h1>
          <p className="muted-text">תצוגת משתמשים ודוחות לפי התאריך שנבחר</p>
        </div>

        <div className="header-actions">
          <div className="date-controls">
            <label htmlFor="snapshot-date">בחירת תאריך</label>
            <input
              id="snapshot-date"
              data-testid="snapshot-date-input"
              type="date"
              value={selectedDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setSelectedDate(nextDate);
                void handleLoadSelectedDate(nextDate);
              }}
              max={todayString}
              min={MIN_DATE}
            />
            <button
              className="btn btn-primary"
              data-testid="load-date-button"
              onClick={() => handleLoadSelectedDate(selectedDate)}
              disabled={!canDownloadSelectedDate}
            >
              טען תאריך
            </button>
            <button
              className="btn btn-primary"
              onClick={handleDownloadDayFile}
              disabled={!canDownloadSelectedDate || filteredPeople.length === 0}
            >
              הורד אקסל ליום
            </button>
            {isReadOnly ? (
              <button
                className="btn btn-secondary"
                onClick={() => void handleLoadSelectedDate(todayString)}
                disabled={actionLoading}
              >
                חזור להיום
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* BACKUP SECTION — only shown when ENVIRONMENT=local and backups exist */}
      {backupFiles.length > 0 && (
        <section className="toolbar-card backup-section">
          <div className="toolbar-card-header">
            <h2>גיבויים זמינים</h2>
            <p className="muted-text">נוצר אוטומטית כל שעה, או בלחיצה ידנית</p>
          </div>

          <div className="backup-controls">
            <div className="filter-group backup-date-group">
              <label htmlFor="backup-date">תאריך גיבוי</label>
              <input
                id="backup-date"
                type="date"
                value={selectedBackupDate}
                min={MIN_DATE}
                max={todayString}
                onChange={(event) => setSelectedBackupDate(event.target.value)}
              />
            </div>

            <div className="backup-status-card">
              {selectedBackup ? (
                <>
                  <strong>{selectedBackup.fileName}</strong>
                  <span className="muted-text">
                    {selectedBackup.isToday && selectedBackup.lastUpdatedAt
                      ? `עודכן לאחרונה: ${formatBackupLastUpdated(selectedBackup.lastUpdatedAt)}`
                      : `קיים גיבוי לתאריך ${selectedBackup.date}`}
                  </span>
                </>
              ) : (
                <>
                  <strong>אין גיבוי לתאריך שנבחר</strong>
                  <span className="muted-text">בחר תאריך אחר כדי להוריד קובץ קיים.</span>
                </>
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={() => selectedBackup && handleBackupDownload(selectedBackup.fileName)}
              disabled={!selectedBackup}
            >
              הורד גיבוי
            </button>
            <button
              className="btn btn-primary"
              onClick={() => void handleRenderBackupNow()}
              disabled={backupRendering}
            >
              {backupRendering ? "יוצר..." : "עדכן עכשיו"}
            </button>
          </div>
        </section>
      )}

      <AppToolbar
        emptyTable={filteredPeople.length === 0}
        actionLoading={actionLoading}
        todayString={todayString}
        filteredPeopleCount={filteredPeople.length}

        // Filters
        searchTerm={searchTerm}
        onSearchTermChange={(event) => setSearchTerm(event.target.value)}
        locationFilter={locationFilter}
        onLocationFilterChange={(event) => setLocationFilter(event.target.value)}
        statusFilter={statusFilter}
        onStatusFilterChange={(event) => setStatusFilter(event.target.value)}

        // Location Management
        locationOptions={locationOptions}
        deletableLocationOptions={deletableLocationOptions}
        newLocationName={newLocationName}
        onNewLocationNameChange={(event) => setNewLocationName(event.target.value)}
        handleAddLocation={handleAddLocation}
        handleDeleteLocation={handleDeleteLocation}
        canAddLocation={canAddLocation}
        canChooseLocationToDelete={canChooseLocationToDelete}
        canDeleteLocation={canDeleteLocation}

        // Users
        canAddUser={canAddUser}
        newUserFullName={newUserFullName}
        newUserPhone={newUserPhone}
        onNewUserFullNameChange={(event) => setNewUserFullName(event.target.value)}
        onNewUserPhoneChange={(event) => setNewUserPhone(event.target.value)}
        handleAddUser={handleAddUser}

        // Delete location
        locationToDelete={locationToDelete}
        onLocationToDeleteChange={(event) =>
          setLocationToDelete(event.target.value)
        }

        // Export range
        downloadFromDate={downloadFromDate}
        downloadToDate={downloadToDate}
        onDownloadFromDateChange={(event) => setDownloadFromDate(event.target.value)}
        onDownloadToDateChange={(event) => setDownloadToDate(event.target.value)}
        handleDownloadRangeFiles={handleDownloadRangeFiles}

        // Imports
        handleImportLocationsFile={handleImportLocationsFile}
        handleImportUsersFile={handleImportUsersFile}
      />

      {isReadOnly ? (
        <div className="history-banner">
          מצב תצוגת היסטוריה: מוצגים דוחות כפי שנמצאו עבור התאריך {selectedDate}
        </div>
      ) : null}

      {error ? <div className="error-banner">{error}</div> : null}

      <main className="content-area">
        {loading ? (
          <div className="loading-box">טוען נתונים...</div>
        ) : filteredPeople.length === 0 && selectedDate !== todayString ? (
          <div className="loading-box">{REPORTS_UNAVAILABLE_MESSAGE}</div>
        ) : (
          <PersonTable
            people={filteredPeople}
            readOnly={isReadOnly || actionLoading}
            onEdit={handleEditPerson}
            onHistory={handleOpenHistory}
          />
        )}
      </main>

      <UserEditModal
        open={Boolean(editingPerson)}
        loading={actionLoading}
        user={editingPerson}
        fullName={editUserFullName}
        phone={editUserPhone}
        onDelete={handleDeleteUser}
        onClose={() => {
          if (actionLoading) {
            return;
          }
          setEditingPerson(null);
        }}
        onFullNameChange={(event) => setEditUserFullName(event.target.value)}
        onPhoneChange={(event) => setEditUserPhone(event.target.value)}
        onSubmit={handleUpdateUser}
      />

      <UserHistoryModal
        open={Boolean(historyPerson)}
        loading={historyLoading}
        saving={historySaving}
        deletingReportId={deletingReportId}
        user={historyPerson}
        reports={historyReports}
        draftReport={draftReport}
        locationOptions={locationOptions}
        minDate={MIN_DATE}
        readOnly={isReadOnly}
        onClose={() => {
          if (historyLoading || historySaving) {
            return;
          }
          setHistoryPerson(null);
          setHistoryReports([]);
          resetDraftReport();
        }}
        onDraftChange={handleDraftReportChange}
        onAddReport={handleAddHistoryReport}
        onDeleteReport={handleDeleteHistoryReport}
        onUpdateReport={handleUpdateHistoryReport}
      />
    </div>
  );
}

export default App;
