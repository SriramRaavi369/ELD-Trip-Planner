import React from 'react';

const LogDetailsForm = ({ metadata, setMetadata }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setMetadata(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="log-details-form card animate-slide-up">
            <div className="card-header">
                <h3>Log Sheet Details</h3>
                <p className="subtitle">Enter info for the professional PDF logs</p>
            </div>
            <div className="form-grid">
                <div className="form-group">
                    <label htmlFor="carrierName">Carrier Name</label>
                    <input
                        type="text"
                        id="carrierName"
                        name="carrierName"
                        value={metadata.carrierName}
                        onChange={handleChange}
                        placeholder="e.g. Schneider National Carriers, Inc."
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="homeTerminal">Home Terminal Address</label>
                    <input
                        type="text"
                        id="homeTerminal"
                        name="homeTerminal"
                        value={metadata.homeTerminal}
                        onChange={handleChange}
                        placeholder="e.g. Green Bay, WI"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="truckNumber">Truck / Trailer Numbers</label>
                    <input
                        type="text"
                        id="truckNumber"
                        name="truckNumber"
                        value={metadata.truckNumber}
                        onChange={handleChange}
                        placeholder="e.g. Truck #101 / Trailer #503"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="shipper">Shipper</label>
                    <input
                        type="text"
                        id="shipper"
                        name="shipper"
                        value={metadata.shipper}
                        onChange={handleChange}
                        placeholder="e.g. Don's Paper Co."
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="commodity">Commodity</label>
                    <input
                        type="text"
                        id="commodity"
                        name="commodity"
                        value={metadata.commodity}
                        onChange={handleChange}
                        placeholder="e.g. Paper products"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="loadNumber">Load Number</label>
                    <input
                        type="text"
                        id="loadNumber"
                        name="loadNumber"
                        value={metadata.loadNumber}
                        onChange={handleChange}
                        placeholder="e.g. ST13241564"
                    />
                </div>
            </div>
        </div>
    );
};

export default LogDetailsForm;
