import React from "react";
import PropTypes from "prop-types";
import { MdInbox } from "react-icons/md";

const EmptyState = ({ icon, title, description, action, className, children }) => (
  <div className={`ui-empty-state empty-state ${className}`.trim()}>
    <div className="ui-empty-state-icon">{icon}</div>
    {title && <p className="ui-empty-state-title">{title}</p>}
    {description && <p className="ui-empty-state-description">{description}</p>}
    {children}
    {action}
  </div>
);

EmptyState.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  action: PropTypes.node,
  className: PropTypes.string,
  children: PropTypes.node,
};

EmptyState.defaultProps = {
  icon: <MdInbox />,
  title: undefined,
  description: undefined,
  action: undefined,
  className: "",
  children: undefined,
};

export default EmptyState;
