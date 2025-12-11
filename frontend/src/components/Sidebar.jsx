import React from 'react';

function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) {
  const menuItems = [
    { id: 'events', label: 'Events & Check-In', icon: '📅' },
    { id: 'students', label: 'Students', icon: '👨‍🎓' },
    { id: 'parents', label: 'Parents', icon: '👨‍👩‍👧' },
    { id: 'groups', label: 'Small Groups', icon: '👥' },
    { id: 'leaders', label: 'Leaders', icon: '🎓' },
    { id: 'volunteers', label: 'Volunteers', icon: '🤝' },
    { id: 'fun', label: 'Fun Features', icon: '🎉' },
    { id: 'graphql', label: 'GraphQL Demo', icon: '🚀' },
    { id: 'manage', label: 'Manage Events', icon: '⚙️' },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside
        id="logo-sidebar"
        className={`fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700`}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
          <ul className="space-y-2 font-medium">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center w-full p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group ${
                    activeTab === item.id
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : ''
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="ml-3">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
