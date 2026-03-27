// Main users table with quick report actions for the selected date.
import PersonTableRow, { type PersonRow } from "./PersonTableRow";

type PersonTableProps = {
  people: PersonRow[];
  readOnly: boolean;
  onHistory: (person: PersonRow) => void;
  onEdit: (person: PersonRow) => void;
};

// Render the main users table with quick actions for location/status updates.
const PersonTable = (props: PersonTableProps) => {
  const { people, readOnly, onEdit, onHistory } = props;

  return (
    <div className="table-wrapper">
      <table className="people-table">
        <thead>
          <tr>
            <th>שם מלא</th>
            <th>מיקום נוכחי</th>
            <th>סטטוס יומי</th>
            <th>טלפון</th>
            <th>עודכן אחרונה</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {people.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-row">
                לא נמצאו נתונים להצגה
              </td>
            </tr>
          ) : (
            people.map((person) => (
              <PersonTableRow
                key={person.person_id}
                person={person}
                readOnly={readOnly}
                onEdit={onEdit}
                onHistory={onHistory}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PersonTable;
