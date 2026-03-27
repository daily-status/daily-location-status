import { MIN_DATE } from "../App.jsx";
import {
  DAILY_STATUS_BAD,
  DAILY_STATUS_MISSING,
  DAILY_STATUS_OK,
} from "../constants/statuses.ts";

function AppToolbar({
  emptyTable,
  actionLoading,
  canAddLocation,
  canAddUser,
  canChooseLocationToDelete,
  canDeleteLocation,
  locationOptions = [],
  deletableLocationOptions = [],
  downloadFromDate,
  downloadToDate,
  filteredPeopleCount,
  handleAddLocation,
  handleAddUser,
  handleDeleteLocation,
  handleDownloadRangeFiles,
  handleImportLocationsFile,
  handleImportUsersFile,
  locationFilter,
  locationToDelete,
  newLocationName,
  newUserFullName,
  newUserPhone,
  onDownloadFromDateChange,
  onDownloadToDateChange,
  onLocationFilterChange,
  onLocationToDeleteChange,
  onNewLocationNameChange,
  onNewUserFullNameChange,
  onNewUserPhoneChange,
  onSearchTermChange,
  onStatusFilterChange,
  searchTerm,
  statusFilter,
  todayString,
}) {
  return (
    <>
      {/* FILTERS */}
      <section className="toolbar-card">
        <div className="toolbar-card-header">
          <h2>פילטרים</h2>
          <p className="muted-text">חיפוש, סינון וייצוא דוחות</p>
        </div>

        <div className="toolbar-card-body">
          {/* Search */}
          <div className="filter-group compact-filter-group">
            <label>חיפוש לפי שם</label>
            <input
              placeholder="הקלד שם..."
              value={searchTerm}
              onChange={onSearchTermChange}
            />
          </div>

          {/* Location filter */}
          <div className="filter-group compact-filter-group">
            <label>פילטר מיקום</label>
            <select value={locationFilter} onChange={onLocationFilterChange}>
              <option value="all">הכול</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="filter-group compact-filter-group">
            <label>פילטר סטטוס</label>
            <select value={statusFilter} onChange={onStatusFilterChange}>
              <option value="all">הכול</option>
              <option value={DAILY_STATUS_OK}>תקין</option>
              <option value={DAILY_STATUS_BAD}>לא תקין</option>
              <option value={DAILY_STATUS_MISSING}>לא הוזן</option>
            </select>
          </div>

          {/* Download */}
          <div className="filter-group download-range-group">
            <label>הורד דוחות לפי טווח</label>
            <div className="download-range-row">
              <input
                type="date"
                value={downloadFromDate}
                max={todayString}
                min={MIN_DATE}
                onChange={onDownloadFromDateChange}
              />
              <input
                type="date"
                value={downloadToDate}
                max={todayString}
                min={MIN_DATE}
                onChange={onDownloadToDateChange}
              />
              <button
                className="btn btn-secondary toolbar-btn"
                onClick={handleDownloadRangeFiles}
                disabled={actionLoading}
              >
                הורד אקסל
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="filter-group summary-box">
            <label>סה"כ מוצגים</label>
            <strong>{filteredPeopleCount}</strong>
          </div>
        </div>
      </section>

      {/* MANAGEMENT */}
      <section className="toolbar-card">
        <div className="toolbar-card-header">
          <h2>ניהול</h2>
          <p className="muted-text">הוספה, מחיקה וייבוא</p>
        </div>

        <div className="toolbar-card-body">
          {/* Add location */}
          <div className="filter-group location-add-group">
            <label>הוספת מיקום</label>
            <div className="location-add-row">
              <input
                placeholder={'לדוגמה: "מיקום 6"'}
                value={newLocationName}
                onChange={onNewLocationNameChange}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddLocation();
                  }
                }}
              />
              <button
                className="btn btn-secondary"
                onClick={handleAddLocation}
                disabled={!canAddLocation}
              >
                הוסף מיקום
              </button>
            </div>
          </div>

          {/* Delete location */}
          <div className="filter-group location-manage-group">
            <label>מחיקה וייבוא מיקומים</label>

              <div className="location-remove-row">
                <select
                  value={locationToDelete}
                  placeholder="בחר מיקום למחיקה"
                  onChange={onLocationToDeleteChange}
                  disabled={!canChooseLocationToDelete}
                >
                  <option value="" disabled>
                    בחר מיקום למחיקה
                  </option>
                  {deletableLocationOptions.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                </select>

                <button
                  className="btn btn-danger"
                  onClick={handleDeleteLocation}
                  disabled={!canDeleteLocation}
                >
                  מחק מיקום
                </button>
              </div>

              {/* Import locations */}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportLocationsFile}
                disabled={actionLoading}
              />
          </div>

          {/* Users */}
          <div className="filter-group user-management-group">
            <label>הוספת משתמש</label>

            <div className="stacked-inputs">
              <input
                placeholder="שם מלא"
                value={newUserFullName}
                onChange={onNewUserFullNameChange}
              />
              <input
                placeholder="טלפון"
                value={newUserPhone}
                onChange={onNewUserPhoneChange}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddUser();
                  }
                }}
              />
            </div>

            <button
              className="btn btn-secondary"
              onClick={handleAddUser}
              disabled={!canAddUser}
            >
              הוסף משתמש
            </button>

            {/* Import users */}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportUsersFile}
              disabled={actionLoading}
            />
          </div>
        </div>
      </section>
    </>
  );
}

export default AppToolbar;
