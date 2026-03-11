function SuccessPage() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-80 space-y-4">
                <h1 className="text-lg font-medium">Thank you for upgrading to Pro!</h1>
                <p className="text-sm text-gray-500">
                    You can now access all features of the Pro plan.
                </p>
            </div>
        </div>
    );
}

export default function Success() {
    return <SuccessPage />;
}