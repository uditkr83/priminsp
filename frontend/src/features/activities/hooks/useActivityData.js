import { useState, useEffect } from "react";
import API from "../../../api";

export function useActivityData(selectedActivity, setSelectedActivity) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [activitiesRes, relationshipsRes] = await Promise.all([
        API.get("/activities"),
        API.get("/relationships")
      ]);

      const rawActivities = activitiesRes.data || [];
      const relationships = relationshipsRes.data || [];

      const enrichedActivities = rawActivities.map(activity => {
        const predecessors = relationships
          .filter(r => r.successor_activity_id === activity.id)
          .map(r => ({
            type: "PRED",
            target_code: r.predecessor_code,
            relationship_type: r.relationship_type
          }));

        const successors = relationships
          .filter(r => r.predecessor_activity_id === activity.id)
          .map(r => ({
            type: "SUCC",
            target_code: r.predecessor_code, 
            relationship_type: r.relationship_type
          }));

        return {
          ...activity,
          dependencies: [...predecessors, ...successors]
        };
      });

      setActivities(enrichedActivities);

      if (enrichedActivities.length > 0) {
        if (!selectedActivity) {
          setSelectedActivity(enrichedActivities[0]);
        } else {
          const updatedSelection = enrichedActivities.find(a => a.id === selectedActivity.id);
          setSelectedActivity(updatedSelection || enrichedActivities[0]);
        }
      }
    } catch (err) {
      console.error("Error aggregating metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return { activities, loading, loadDashboardData };
}