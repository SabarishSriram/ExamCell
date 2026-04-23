import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import ElectiveUploadModal from "./ElectiveUploadModal";
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
import { toast } from "sonner";

const AddExamModal = ({ isOpen, onClose, onSuccess, courses, sections }) => {
  const [course, setCourse] = useState("");
  const [date, setDate] = useState(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [isElectiveModalOpen, setIsElectiveModalOpen] = useState(false);
  const [isElective, setIsElective] = useState(false);
  const [electiveRegNos, setElectiveRegNos] = useState(null);

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
    const value = `${String(hour24).padStart(2, "0")}:${String(m).padStart(
      2,
      "0",
    )}`;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const label = `${String(hour12).padStart(2, "0")}:${String(m).padStart(
      2,
      "0",
    )} ${hour24 < 12 ? "am" : "pm"}`;
    return { value, label, minutes: hour24 * 60 + m };
  };

  const fromOptions = baseFrom.map(toOption);
  const toOptions = baseTo.map(toOption);
  const [venues, setVenues] = useState({});
  const [year, setYear] = useState("");
  const [selectedSections, setSelectedSections] = useState([]);
  const [bookletType, setBookletType] = useState("");
  const [sectionCounts, setSectionCounts] = useState({});
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    api.get("/section-counts").then((r) => setSectionCounts(r.data)).catch(() => {});
    api.get("/inventory").then((r) => setInventory(r.data)).catch(() => {});
  }, [isOpen]);

  const YEAR_SUFFIX_MAP = {
    "1st Year": "25",
    "2nd Year": "24",
    "3rd Year": "23",
  };

  const filteredCourses = year ? courses.filter((c) => c.Year === year) : [];

  const filteredSections = React.useMemo(() => {
    if (!year) return [];
    const suffix = YEAR_SUFFIX_MAP[year];
    if (!suffix) return sections;
    return (sections || []).filter((section) => {
      const match = String(section).match(/-(\d{2})$/);
      if (!match) return false;
      return match[1] === suffix;
    });
  }, [year, sections]);
  const handleElectiveParsed = ({ year: parsedYear, sections: parsedSections, venue: parsedVenue, course: parsedCourse, courseCode: parsedCourseCode, electiveRegNos: parsedElectiveRegNos }) => {
    setIsElective(true);
    if (parsedYear) setYear(parsedYear);
    const formatted = parsedCourse
      ? parsedCourseCode
        ? `${parsedCourse} (${parsedCourseCode})`
        : parsedCourse
      : "";
    setCourse(formatted);
    setElectiveRegNos(parsedElectiveRegNos || null);

    if (parsedSections && parsedSections.length > 0 && parsedYear) {
      const suffix = YEAR_SUFFIX_MAP[parsedYear];
      const matchedSections = parsedSections
        .map((s) => {
          const candidate = suffix ? `${s}-${suffix}` : null;
          return candidate && sections.includes(candidate) ? candidate : null;
        })
        .filter(Boolean);

      setSelectedSections(matchedSections);

      if (parsedVenue) {
        const newVenues = {};
        matchedSections.forEach((sec) => { newVenues[sec] = parsedVenue; });
        setVenues(newVenues);
      }
    }
  };

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
      toast.error(
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
        venue:
          venueBySection[selectedSections[0]] ||
          Object.values(venueBySection)[0] ||
          "",
        ...(electiveRegNos ? { electiveRegNos } : {}),
        ...(bookletType ? { bookletType } : {}),
      };
      await api.post("/exams", payload);
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
      setIsElective(false);
      setElectiveRegNos(null);
      setBookletType("");
      toast.success("Exam scheduled successfully!");
    } catch (error) {
      console.error("Error adding exam:", error);
      toast.error("Failed to schedule exam. Please try again.");
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
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Exam</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={year}
                onValueChange={(val) => {
                  setYear(val);
                  setCourse("");
                  setIsElective(false);
                  setSelectedSections([]);
                  setVenues({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Year">1st Year</SelectItem>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">
                Course{isElective && (
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded align-middle">
                    Elective
                  </span>
                )}
              </Label>
              {isElective ? (
                <Input
                  id="course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Enter elective course name"
                />
              ) : (
                <Select value={course} onValueChange={setCourse} disabled={!year}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={year ? "Select a course" : "Select year first"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCourses.map((c) => (
                      <SelectItem key={c["Course Code"]} value={c["Course Name"]}>
                        {c["Course Name"]} ({c["Course Code"]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
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

          <div className="space-y-3">
            <Label>Target Sections & Venues</Label>
            <div className="space-y-3 border rounded-md p-4">
              {filteredSections.map((section) => {
                const selected = selectedSections.includes(section);
                const count = sectionCounts[section];
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
                        {count != null && (
                          <span className="ml-1.5 text-xs text-slate-400 font-normal">
                            ({count} students)
                          </span>
                        )}
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

          <div className="space-y-2">
            <Label>Booklet Type</Label>
            <Select value={bookletType} onValueChange={setBookletType}>
              <SelectTrigger>
                <SelectValue placeholder="Select booklet type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="40-page">40-Page Booklet</SelectItem>
                <SelectItem value="15-page">15-Page Booklet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {bookletType && selectedSections.length > 0 && (() => {
            const totalStudents = selectedSections.reduce(
              (sum, s) => sum + (sectionCounts[s] || 0),
              0
            );
            const stockEntry = inventory.find((i) => i.type === bookletType);
            const available = stockEntry?.quantity ?? 0;
            const sufficient = available >= totalStudents;
            return (
              <div className={`rounded-lg border p-3 text-sm ${sufficient ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex items-center gap-2 mb-2 font-semibold">
                  {sufficient
                    ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                    : <AlertTriangle className="w-4 h-4 text-amber-600" />
                  }
                  <span className={sufficient ? "text-green-700" : "text-amber-700"}>
                    Booklet Impact — {bookletType}
                  </span>
                </div>
                <div className="space-y-1 text-slate-600">
                  {selectedSections.map((s) => (
                    <div key={s} className="flex justify-between text-xs">
                      <span>{s}</span>
                      <span className="font-medium">{sectionCounts[s] ?? "?"} booklets</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 mt-1 pt-1 flex justify-between font-semibold">
                    <span>Total needed</span>
                    <span>{totalStudents}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Available in stock</span>
                    <span className={sufficient ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>
                      {available.toLocaleString()}
                    </span>
                  </div>
                  {!sufficient && (
                    <p className="text-xs text-amber-700 mt-1 font-medium">
                      Shortfall of {totalStudents - available} booklets — update inventory before proceeding.
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

        <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              className="mr-auto flex items-center gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
              onClick={() => setIsElectiveModalOpen(true)}
            >
              <BookOpen className="w-4 h-4" />
              Elective
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Complete Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ElectiveUploadModal
      isOpen={isElectiveModalOpen}
      onClose={() => setIsElectiveModalOpen(false)}
      onParsed={handleElectiveParsed}
    />
    </>
  );
};

export default AddExamModal;
