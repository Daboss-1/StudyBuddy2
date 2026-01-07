import { useState, useEffect } from 'react';
import { Card, Badge, Button, Row, Col, Table } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

export default function CacheStatus() {
  const { getCacheStats, clearClassroomCache, cacheInitialized } = useAuth();
  const [cacheStats, setCacheStats] = useState({});
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    if (cacheInitialized) {
      refreshStats();
    }
  }, [cacheInitialized, lastRefresh]);

  const refreshStats = () => {
    if (cacheInitialized) {
      const stats = getCacheStats();
      setCacheStats(stats);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all cached classroom data? This will force fresh data to be downloaded on next access.')) {
      clearClassroomCache();
      refreshStats();
    }
  };

  const formatDataSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (isValid, hasData) => {
    if (!hasData) return <Badge bg="secondary">No Data</Badge>;
    if (isValid) return <Badge bg="success">Fresh</Badge>;
    return <Badge bg="warning">Stale</Badge>;
  };

  if (!cacheInitialized) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">Cache Status</h5>
        </Card.Header>
        <Card.Body>
          <p className="text-muted">Cache not initialized</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Classroom Data Cache Status</h5>
        <div>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={() => setLastRefresh(Date.now())}
            className="me-2"
          >
            <i className="fas fa-sync-alt"></i> Refresh
          </Button>
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={handleClearCache}
          >
            <i className="fas fa-trash"></i> Clear Cache
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col>
            <Table striped bordered size="sm">
              <thead>
                <tr>
                  <th>Data Type</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cacheStats).map(([dataType, stats]) => (
                  <tr key={dataType}>
                    <td className="text-capitalize">{dataType}</td>
                    <td>{getStatusBadge(stats.isValid, stats.hasData)}</td>
                    <td>
                      {stats.lastUpdate 
                        ? new Date(stats.lastUpdate).toLocaleString()
                        : 'Never'
                      }
                    </td>
                    <td>{formatDataSize(stats.dataSize)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Col>
        </Row>
        
        <div className="mt-3">
          <h6>Cache Benefits:</h6>
          <ul className="small text-muted">
            <li><strong>Reduced API calls:</strong> Data is cached locally to avoid hitting Google Classroom API limits</li>
            <li><strong>Background refresh:</strong> Data updates automatically in the background</li>
            <li><strong>Offline capability:</strong> Cached data available even when API is temporarily unavailable</li>
            <li><strong>Better performance:</strong> Instant data loading from local storage</li>
          </ul>
        </div>

        <div className="mt-2">
          <small className="text-muted">
            <i className="fas fa-info-circle me-1"></i>
            Cache automatically refreshes data every 10-45 minutes depending on data type. 
            Fresh data is fetched in the background without interrupting your work.
          </small>
        </div>
      </Card.Body>
    </Card>
  );
}
