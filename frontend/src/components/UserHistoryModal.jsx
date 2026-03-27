import {
  DAILY_STATUS_BAD,
  DAILY_STATUS_MISSING,
  DAILY_STATUS_OK,
} from "../constants/statuses";
import { formatTimestamp, toLocalDateTimeInput } from "../utils/dates";

const getHistoryStatusLabel = (value) => {
  if (value === true) {
    return DAILY_STATUS_OK;
  }

  if (value === false) {
    return DAILY_STATUS_BAD;
  }

  return DAILY_STATUS_MISSING;
};

function UserHistoryModal({
  open,
  loading,
  readOnly,
  saving,
  deletingReportId,
  user,
  reports,
  draftReport,
  locationOptions,
  minDate,
  onClose,
  onDraftChange,
  onAddReport,
  onDeleteReport,
  onUpdateReport,
}) {
  if (!open || !user) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal tracking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="user-history-title">היסטוריית דיווחים: {user.full_name}</h3>

        <div className="history-create-card">
          <strong>הוסף דיווח</strong>
          <div className="history-report-editor">
            <input
              list="history-location-options"
              value={draftReport.locationName}
              onChange={(event) => onDraftChange("locationName", event.target.value)}
              placeholder="בחר או הקלד מיקום"
              disabled={readOnly || saving}
            />
            <datalist id="history-location-options">
              {locationOptions.map((location) => (
                <option key={location} value={location} />
              ))}
            </datalist>

            <div className="history-status-buttons">
              {[DAILY_STATUS_OK, DAILY_STATUS_BAD].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`btn btn-chip ${draftReport.status === status ? "active-date" : ""}`}
                  onClick={() => onDraftChange("status", status)}
                  disabled={readOnly || saving}
                >
                  {status}
                </button>
              ))}
            </div>

            <input
              type="datetime-local"
              min={minDate}
              value={draftReport.occurredAt}
              onChange={(event) => onDraftChange("occurredAt", event.target.value)}
              disabled={readOnly || saving}
            />

            <button
              type="button"
              className="btn btn-primary"
              onClick={onAddReport}
              disabled={readOnly || saving}
            >
              הוסף דיווח
            </button>
          </div>
        </div>

        {readOnly ? (
          <div className="tracking-readonly-note">
            דוחות מתאריכים קודמים מוצגים לקריאה בלבד.
          </div>
        ) : null}

        {loading ? (
          <div className="loading-box">טוען היסטוריה...</div>
        ) : reports.length === 0 ? (
          <div className="tracking-readonly-note">אין דיווחים להצגה.</div>
        ) : (
          <div className="tracking-events-list">
            {reports.map((report) => (
              <div key={report.id} className="tracking-event-row">
                <div className="tracking-event-meta">
                  <strong>{formatTimestamp(report.occurredAt)}</strong>
                  <span className="status-chip neutral-chip">{report.locationName}</span>
                  <span className="status-chip neutral-chip">
                    {getHistoryStatusLabel(report.isStatusOk)}
                  </span>
                </div>

                <div className="tracking-event-details">
                  <span>מקור: {report.source}</span>
                  <span>נוצר: {formatTimestamp(report.createdAt)}</span>
                </div>

                <div className="history-report-editor">
                  <input
                    list="history-location-options"
                    value={report.locationName}
                    onChange={(event) =>
                      onDraftChange(`report:${report.id}:locationName`, event.target.value)
                    }
                    placeholder="בחר או הקלד מיקום"
                    disabled={readOnly || !report.isEditable || saving}
                  />

                  <div className="history-status-buttons">
                    {[DAILY_STATUS_OK, DAILY_STATUS_BAD, DAILY_STATUS_MISSING].map((status) => (
                      <button
                        key={`${report.id}-${status}`}
                        type="button"
                        className={`btn btn-chip ${
                          getHistoryStatusLabel(report.isStatusOk) === status ? "active-date" : ""
                        }`}
                        onClick={() => onDraftChange(`report:${report.id}:status`, status)}
                        disabled={readOnly || !report.isEditable || saving}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <input
                    type="datetime-local"
                    min={minDate}
                    value={toLocalDateTimeInput(report.occurredAt)}
                    onChange={(event) =>
                      onDraftChange(`report:${report.id}:occurredAt`, event.target.value)
                    }
                    disabled={readOnly || !report.isEditable || saving}
                  />

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onUpdateReport(report.id)}
                    disabled={readOnly || !report.isEditable || saving}
                  >
                    שמור
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onDeleteReport(report.id)}
                    disabled={readOnly || !report.isEditable || deletingReportId === report.id}
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-danger" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserHistoryModal;
