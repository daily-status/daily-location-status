function UserEditModal({
  open,
  loading,
  user,
  fullName,
  phone,
  onDelete,
  onClose,
  onFullNameChange,
  onPhoneChange,
  onSubmit,
}) {
  if (!open || !user) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="user-edit-title">עריכת משתמש</h3>
        <form
          className="modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label>
            שם מלא
            <input value={fullName} onChange={onFullNameChange} />
          </label>
          <label>
            טלפון
            <input value={phone} onChange={onPhoneChange} />
          </label>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              שמור
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onDelete}
              disabled={loading}
            >
              מחק משתמש
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserEditModal;
