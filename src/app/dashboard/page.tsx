export default function DashboardPage() {
  return (
    <div className="px-8 pt-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            Campaigns
          </h1>
          <p className="text-sm text-neutral-500 mt-1">0 campaigns</p>
        </div>
        <button
          disabled
          className="bg-neutral-900 text-white rounded-md px-4 py-2 text-sm font-medium opacity-50 cursor-not-allowed"
        >
          New Campaign
        </button>
      </div>

      <div className="py-16 text-center">
        <p className="text-sm text-neutral-400">No campaigns yet</p>
        <p className="text-xs text-neutral-300 mt-1.5">
          Create your first campaign to start finding leads
        </p>
      </div>
    </div>
  );
}
