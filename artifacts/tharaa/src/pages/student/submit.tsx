import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SubmitLog() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/student");
  }, [setLocation]);
  return null;
}
