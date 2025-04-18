
import TaskManager from "@/components/TaskManager";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Task Manager
        </h1>
        <TaskManager />
      </div>
    </div>
  );
};

export default Index;
