import clsx from "clsx";
import { getLocationChipClass } from "../constants/locations";
import {
  getDailyStatusChipClass,
} from "../constants/statuses";
import { formatTimestamp } from "../utils/dates";

// Compatibility row shape used while App.jsx adapts users + reports into the table.
export type PersonRow = {
  person_id: string;
  full_name: string;
  location: string;
  daily_status: string;
  phone?: string;
  last_updated?: string;
};

type PersonTableRowProps = {
  person: PersonRow;
  readOnly: boolean;
  onEdit: (person: PersonRow) => void;
  onHistory: (person: PersonRow) => void;
};

const PersonTableRow = ({
  person,
  readOnly,
  onEdit,
  onHistory,
}: PersonTableRowProps) => {
  return (
    <tr>
      <td>{person.full_name}</td>
      <td>
        <span className={`status-chip ${getLocationChipClass(person.location)}`}>
          {person.location}
        </span>
      </td>
      <td>
        <span className={clsx("status-chip", getDailyStatusChipClass(person.daily_status))}>
          {person.daily_status}
        </span>
      </td>
      <td>{person.phone || "-"}</td>
      <td>{formatTimestamp(person.last_updated)}</td>
      <td>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => onHistory(person)}
        >
          היסטוריה
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => onEdit(person)}
        >
          עריכה
        </button>
      </td>
    </tr>
  );
};

export default PersonTableRow;
