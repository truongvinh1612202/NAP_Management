import React from "react";

interface LoadingStateProps {
  title?: string;
  subtitle?: string;
  message?: string;
  /** Tailwind height class for the center box, e.g. 'h-64' */
  heightClass?: string;
  /** Additional classes for the outer container */
  containerClassName?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  title,
  subtitle,
  message = "Đang tải dữ liệu...",
  heightClass = "h-64",
  containerClassName = "",
}) => {
  return (
    <div className={["p-6", containerClassName].filter(Boolean).join(" ")}>
      {title ? (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-2">{subtitle}</p>}
        </div>
      ) : null}

      <div className={`flex justify-center items-center ${heightClass}`}>
        <div className="text-lg text-gray-600">{message}</div>
      </div>
    </div>
  );
};

export default LoadingState;
