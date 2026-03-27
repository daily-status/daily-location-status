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
  exportReports,
  exportReportsDownloadInfo,
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
  DEFAULT_LOCATION_OPTIONS,
  uniqueLocations,
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

function App() {
  const todayString = getTodayString();
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [availableDates, setAvailableDates] = useState([todayString]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
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
  const homeLocation = DEFAULT_LOCATION_OPTIONS[0];
  const locationOptions = useMemo(() => {
    const apiLocationNames = locations.map((location) => location.name);
    const fallbackLocations =
      apiLocationNames.length > 0 ? apiLocationNames : DEFAULT_LOCATION_OPTIONS;

    return uniqueLocations(fallbackLocations);
  }, [locations]);

  const locationIdByName = useMemo(
    () =>
      new Map(
        locations
          .filter((location) => location?.name)
          .map((location) => [location.name, Number(location.id)])
      ),
    [locations]
  );

  const locationNameById = useMemo(
    () =>
      new Map(
        locations.map((location) => [Number(location.id), String(location.name || "")])
      ),
    [locations]
  );

  const deletableLocationOptions = useMemo(
    () => locationOptions.filter((location) => location !== homeLocation),
    [locationOptions, homeLocation]
  );

  const people = useMemo(() => {
    return users.map((user) => {
      const latestReport = getLatestReportForUser(reports, user.id);
      const location =
        locationNameById.get(Number(latestReport?.locationId)) ||
        (latestReport ? String(latestReport.locationId) : "");

      return {
        person_id: String(user.id),
        full_name: String(user.fullName || ""),
        location,
        daily_status: mapReportStatusToDailyStatus(latestReport?.isStatusOk),
        phone: user.phone ? String(user.phone) : "",
        last_updated: latestReport?.occurredAt || "",
      };
    });
  }, [locationNameById, reports, users]);

  const filteredPeople = useMemo(() => {
    return people
      .filter((person) => {
        const fullName = String(person?.full_name || "");
        const location = String(person?.location || "");
        const dailyStatus = String(person?.daily_status || "");

        if (
          searchTerm &&
          !fullName.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }

        if (locationFilter !== "all" && location !== locationFilter) {
          return false;
        }

        if (statusFilter !== "all" && dailyStatus !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) =>
        String(a?.full_name || "").localeCompare(String(b?.full_name || ""), "he")
      );
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

  useEffect(() => {
    void loadDashboard(todayString);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (deletableLocationOptions.length === 0) {
      setLocationToDelete("");
      return;
    }

    if (!deletableLocationOptions.includes(locationToDelete)) {
      setLocationToDelete(deletableLocationOptions[0]);
    }
  }, [deletableLocationOptions, locationToDelete]);

  async function loadDashboard(dateValue) {
    setLoading(true);
    setError("");

    try {
      const [usersResponse, locationsResponse, allReportsResponse, dateReportsResponse] =
        await Promise.all([
          fetchUsers(),
          fetchLocations(),
          fetchReports(),
          fetchReports({ date: dateValue }),
        ]);

      const safeUsers = Array.isArray(usersResponse) ? usersResponse : [];
      const safeLocations = Array.isArray(locationsResponse) ? locationsResponse : [];
      const safeAllReports = Array.isArray(allReportsResponse) ? allReportsResponse : [];
      const safeDateReports = Array.isArray(dateReportsResponse)
        ? dateReportsResponse
        : [];

      setUsers(safeUsers);
      setLocations(safeLocations);
      setReports(safeDateReports);
      setSelectedDate(dateValue);
      setAvailableDates(buildAvailableDates(safeAllReports, todayString, dateValue));
    } catch (err) {
      setUsers([]);
      setLocations([]);
      setReports([]);
      setAvailableDates([todayString]);
      setError(getErrorMessage(err, "טעינת הנתונים נכשלה"));
    } finally {
      setLoading(false);
    }
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

  async function handleLoadSelectedDate(dateValue) {
    if (!dateValue) {
      setError("יש לבחור תאריך לטעינה");
      return;
    }

    await loadDashboard(dateValue);
  }

  function handleEditPerson(person) {
    setEditingPerson(person);
    setEditUserFullName(String(person?.full_name || ""));
    setEditUserPhone(String(person?.phone || ""));
  }

  async function handleDownloadDayFile() {
    if (!selectedDate) {
      setError("יש לבחור תאריך להורדה");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const user = searchTerm ? people.find(person => person.full_name === searchTerm) : undefined;
      const locationId = locationIdByName.get(locationFilter);
      

      const filters = {
        date: selectedDate,
        locationId: locationId ? Number(locationId) : undefined,
        userId: user ? Number(user.person_id) : undefined,
      };

      const response = await exportReports(filters);
      
      if (Object.keys(response).length === 0) {        
        setError("אין דוחות להצגה  בתאריכים שנבחרו");
        return;
      }

      const { url, filename } = exportReportsDownloadInfo(filters, `reports_${selectedDate}.xlsx`);   

      triggerFileDownload(url, filename);
    } catch (err) {
      setError(getErrorMessage(err, "הורדת דוח היום נכשלה"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDownloadRangeFiles() {
    if (!downloadFromDate || !downloadToDate) {
      setError("יש לבחור טווח תאריכים מלא");
      return;
    }

    if (downloadFromDate > downloadToDate) {
      setError("תאריך התחלה חייב להיות קטן או שווה לתאריך סיום");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const user = searchTerm ? people.find(person => person.full_name === searchTerm) : undefined;
      const locationId = locationIdByName.get(locationFilter);
      
      const filters = {
        minDate: downloadFromDate,
        maxDate: downloadToDate,
        locationId: locationId ? Number(locationId) : undefined,
        userId: user ? Number(user.person_id) : undefined,
      };

      const response = await exportReports(filters);
      
      if (Object.keys(response).length === 0) {        
        setError("אין דוחות להצגה  בתאריכים שנבחרו");
        return;
      }

      const { url, filename } = exportReportsDownloadInfo(filters, `reports_${downloadFromDate}_to_${downloadToDate}.xlsx`);
      triggerFileDownload(url, filename);
    } catch (err) {
      setError(getErrorMessage(err, "הורדת דוחות הטווח נכשלה"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddLocation() {
    const normalized = normalizeLocationName(newLocationName);
    if (!normalized) {
      setError("יש להזין שם מיקום לפני הוספה");
      return;
    }

    if (locationOptions.includes(normalized)) {
      setError("המיקום כבר קיים ברשימה");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await createLocation(normalized);
      setNewLocationName("");
      await loadDashboard(selectedDate);
    } catch (err) {
      setError(getErrorMessage(err, "הוספת מיקום נכשלה"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteLocation() {
    const normalized = normalizeLocationName(locationToDelete);
    if (!normalized) {
      setError("יש לבחור מיקום למחיקה");
      return;
    }

    const location = locations.find((item) => item.name === normalized);
    if (!location) {
      setError("לא נמצא מזהה למיקום שנבחר");
      return;
    }

    const approved = window.confirm(`למחוק את המיקום "${normalized}"?`);
    if (!approved) {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await deleteLocation(location.id);
      setLocationToDelete("");
      if (locationFilter === normalized) {
        setLocationFilter("all");
      }
      await loadDashboard(selectedDate);
    } catch (err) {
      setError(getErrorMessage(err, "מחיקת מיקום נכשלה"));
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
      const message = getErrorMessage(err, "הוספת משתמש נכשלה");
      if (message.includes("already exists")) {
        setError("מספר הטלפון כבר קיים במערכת");
      } else if (message.includes("invalid_format")) {
        setError("מספר הטלפון אינו תקין");
      } else {
        setError(message);
      }
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
      const message = getErrorMessage(err, "הוספת משתמש נכשלה");

      if(message.includes("invalid_format")) {
        setError(getErrorMessage("אחד או יותר ממספרי הטלפון שהוזנו לא היו תקינים", "ייבוא משתמשים מאקסל נכשל"));
      } else {
        setError(message);
      }
      
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
              onChange={(event) => setSelectedDate(event.target.value)}
              max={todayString}
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
          </div>
        </div>
      </header>

      <AppToolbar
        emptyTable={filteredPeople.length === 0}
        actionLoading={actionLoading}
        canAddLocation={canAddLocation}
        canAddUser={canAddUser}
        canChooseLocationToDelete={canChooseLocationToDelete}
        canDeleteLocation={canDeleteLocation}
        locationOptions={locationOptions}
        deletableLocationOptions={deletableLocationOptions}
        downloadFromDate={downloadFromDate}
        downloadToDate={downloadToDate}
        filteredPeopleCount={filteredPeople.length}
        handleAddLocation={handleAddLocation}
        handleAddUser={handleAddUser}
        handleDeleteLocation={handleDeleteLocation}
        handleDownloadRangeFiles={handleDownloadRangeFiles}
        handleImportLocationsFile={handleImportLocationsFile}
        handleImportUsersFile={handleImportUsersFile}
        locationFilter={locationFilter}
        locationToDelete={locationToDelete}
        newLocationName={newLocationName}
        newUserFullName={newUserFullName}
        newUserPhone={newUserPhone}
        onDownloadFromDateChange={(event) => setDownloadFromDate(event.target.value)}
        onDownloadToDateChange={(event) => setDownloadToDate(event.target.value)}
        onLocationFilterChange={(event) => setLocationFilter(event.target.value)}
        onLocationToDeleteChange={(event) =>
          setLocationToDelete(event.target.value)
        }
        onNewLocationNameChange={(event) => setNewLocationName(event.target.value)}
        onNewUserFullNameChange={(event) => setNewUserFullName(event.target.value)}
        onNewUserPhoneChange={(event) => setNewUserPhone(event.target.value)}
        onSearchTermChange={(event) => setSearchTerm(event.target.value)}
        onStatusFilterChange={(event) => setStatusFilter(event.target.value)}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        todayString={todayString}
      />

      {availableDates.length > 0 ? (
        <section className="dates-card">
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
              onClick={handleDownloadDayFile}
              disabled={!canDownloadSelectedDate}
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
        </section>
      ) : null}

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
