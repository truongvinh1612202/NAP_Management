import { useState } from "react";
import NavigationMenu from "../components/NavigationMenu";
import { DatabaseConfigModal } from "../components/DatabaseConfigModal";
import DanhMucKhachHang from "./DanhMucKhachHang";
import DanhMucNhanVien from "./DanhMucNhanVien";
import PaymentList from "./PaymentList";
import type { DatabaseConfig } from "../../electron/api";

const Main = () => {
  const [activeView, setActiveView] = useState("companies");
  const [isDatabaseConfigOpen, setIsDatabaseConfigOpen] = useState(false);

  const handleMenuItemClick = (itemId: string) => {
    if (itemId === "database-config") {
      setIsDatabaseConfigOpen(true);
    } else {
      setActiveView(itemId);
    }
  };

  const handleDatabaseConfigSave = (config: DatabaseConfig) => {
    console.log("Database configuration saved:", config);
  };

  const renderContent = () => {
    switch (activeView) {
      case "companies":
        return <DanhMucKhachHang />;
      case "employees":
        return <DanhMucNhanVien />;
      case "payments":
        return <PaymentList />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 w-[100vw]">
      <NavigationMenu onItemClick={handleMenuItemClick} />

      <div className="flex-1 overflow-auto px-3">{renderContent()}</div>

      <DatabaseConfigModal
        isOpen={isDatabaseConfigOpen}
        onClose={() => setIsDatabaseConfigOpen(false)}
        onSave={handleDatabaseConfigSave}
      />
    </div>
  );
};

export default Main;
