import React, { useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Checkbox } from "./ui/checkbox";

const AddExamModal = ({ isOpen, onClose, onSuccess, courses, sections }) => {
  const [course, setCourse] = useState("");
  const [date, setDate] = useState(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");

  const baseFrom = [
    "8:00",
    "8:50",
    "9:45",
    "10:40",
    "11:35",
    "12:30",
    "1:25",
    "2:20",
    "3:10",
    "4:00",
    "4:50",
    "5:30",
  ];
  const baseTo = [
    "8:50",
    "9:40",
    "10:35",
    "11:30",
    "12:35",
    "1:20",
    "2:15",
    "3:10",
    "4:00",
    "4:50",
    "5:30",
    "6:10",
  ];

  const toOption = (t) => {
    const [hStr, mStr] = t.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    let hour24;
    if (h === 12) hour24 = 12;
    else if (h >= 8 && h <= 11)
      hour24 = h; // AM
    else hour24 = h + 12; // 1-7 -> PM
    const value = `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const label = `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${hour24 < 12 ? "am" : "pm"}`;
    return { value, label, minutes: hour24 * 60 + m };
  };

  const fromOptions = baseFrom.map(toOption);
  const toOptions = baseTo.map(toOption);
  const [venues, setVenues] = useState({});
  const [year, setYear] = useState("");
  const [selectedSections, setSelectedSections] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !course ||
      !date ||
      !fromTime ||
      !toTime ||
      !year ||
      selectedSections.length === 0 ||
      selectedSections.some(
        (section) => !venues[section] || !venues[section].trim(),
      )
    ) {
      alert(
        "Please fill all fields, select at least one section, and enter venue for each selected section",
      );
      return;
    }

    try {
      const fromLabel =
        fromOptions.find((o) => o.value === fromTime)?.label || fromTime;
      const toLabel =
        toOptions.find((o) => o.value === toTime)?.label || toTime;
      const venueBySection = selectedSections.reduce((acc, section) => {
        acc[section] = venues[section].trim();
        return acc;
      }, {});
      const payload = {
        course,
        date: date.toISOString(),
        time: `${fromLabel} - ${toLabel}`,
        from: fromLabel,
        to: toLabel,
        year,
        sections: selectedSections,
        venueBySection,
        // Fallback for existing views that use a single venue
        venue:
          venueBySection[selectedSections[0]] ||
          Object.values(venueBySection)[0] ||
          "",
      };
      await axios.post(`http://localhost:8000/api/exams`, payload);
      onSuccess();
      onClose();
      // Reset form
      setCourse("");
      setDate(null);
      setDateOpen(false);
      setFromTime("");
      setToTime("");
      setVenues({});
      setYear("");
      setSelectedSections([]);
    } catch (error) {
      console.error("Error adding exam:", error);
    }
  };

  const toggleSection = (sectionId) => {
    setSelectedSections((prev) => {
      if (prev.includes(sectionId)) {
        const next = prev.filter((s) => s !== sectionId);
        const { [sectionId]: _removed, ...restVenues } = venues;
        setVenues(restVenues);
        return next;
      }
      return [...prev, sectionId];
    });
  };

  const handleVenueChange = (sectionId, value) => {
    setVenues((prev) => ({
      ...prev,
      [sectionId]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Exam</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c["Course Code"]} value={c["Course Name"]}>
                    {c["Course Name"]} ({c["Course Code"]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label>Exam Date</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      setDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="from">From</Label>
                  <Select value={fromTime} onValueChange={setFromTime}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="From" />
                    </SelectTrigger>
                    <SelectContent>
                      {fromOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Select value={toTime} onValueChange={setToTime}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="To" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const selectedFromMinutes = fromOptions.find(
                          (x) => x.value === fromTime,
                        )?.minutes;
                        return toOptions.map((o) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            disabled={
                              selectedFromMinutes
                                ? o.minutes <= selectedFromMinutes
                                : false
                            }
                          >
                            {o.label}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Year">1st Year</SelectItem>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                  <SelectItem value="4th Year">4th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Target Sections & Venues</Label>
            <div className="space-y-3 border rounded-md p-4">
              {sections.map((section) => {
                const selected = selectedSections.includes(section);
                return (
                  <div
                    key={section}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`section-${section}`}
                        checked={selected}
                        onCheckedChange={() => toggleSection(section)}
                      />
                      <label
                        htmlFor={`section-${section}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {section}
                      </label>
                    </div>
                    <div className="sm:col-span-2 relative">
                      <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={`Venue for ${section}`}
                        className="pl-9"
                        value={venues[section] || ""}
                        onChange={(e) =>
                          handleVenueChange(section, e.target.value)
                        }
                        disabled={!selected}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Complete Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExamModal;
