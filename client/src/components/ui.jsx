import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MODE_COLOR, MODE_ICON } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";

// Bootstrap's modal markup, opened and closed by React instead of Bootstrap's JavaScript.
export function Modal({ title, onClose, children, footer, size = "lg" }) {
  const { t } = useI18n();
  return (
    <>
      <div className="modal d-block" tabIndex="-1" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className={`modal-dialog modal-${size} modal-dialog-scrollable`}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label={t("common.close")} onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export function ErrorAlert({ error, onClose }) {
  const { t } = useI18n();
  if (!error) return null;
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-start gap-2" role="alert">
      <span dir="auto">{error}</span>
      {onClose && <button type="button" className="btn-close" aria-label={t("common.close")} onClick={onClose} />}
    </div>
  );
}

// dir="auto" lets each paragraph run left-to-right or right-to-left by its own text.
export function Markdown({ children }) {
  return (
    <div className="markdown" dir="auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function KindBadge({ kind }) {
  const { t } = useI18n();
  return (
    <span className={`badge kind-badge ${kind === "S" ? "text-bg-primary" : "text-bg-secondary"}`} title={t(`kind.${kind}`)}>
      {kind}
    </span>
  );
}

export function ModeBadge({ mode }) {
  const { t } = useI18n();
  if (!MODE_COLOR[mode]) return null;
  return (
    <span className={`badge rounded-pill text-bg-${MODE_COLOR[mode]}`}>
      <i className={`bi ${MODE_ICON[mode]} me-1`} />
      {t(`mode.${mode}`)}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
      <div>
        <h1 className="h3 mb-1">{title}</h1>
        {subtitle && <p className="text-secondary mb-0">{subtitle}</p>}
      </div>
      <div className="d-flex gap-2">{children}</div>
    </div>
  );
}
