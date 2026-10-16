# Frontend Structure Guide

- `api/`: Centralized API client functions communicating with Express REST endpoints.
- `components/`: Reusable presentation and form components (Card, Button, Table, Modal).
- `pages/`: Page-level views (Login, Register, Dashboard, Subjects, TestSeries, TestTaking, Solutions, Admin).
- `layouts/`: Shared wrappers (StudentLayout, AdminLayout, AuthLayout).
- `hooks/`: Custom React hooks (useAuth, useTestTimer, useFetch).
- `context/`: React context providers (AuthContext, TestSessionContext).
- `routes/`: React Router configuration and route guard components.
- `utils/`: Formatters, timer calculations, and validation helpers.
