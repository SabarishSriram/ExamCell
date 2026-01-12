import React, { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPin, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Checkbox } from './ui/checkbox';

const AddExamModal = ({ isOpen, onClose, onSuccess, courses, sections }) => {
  const [course, setCourse] = useState('');
  const [date, setDate] = useState(null);
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [year, setYear] = useState('');
  const [selectedSections, setSelectedSections] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!course || !date || !time || !venue || !year || selectedSections.length === 0) {
      alert("Please fill all fields and select at least one section");
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/exams', {
        course,
        date: date.toISOString(),
        time,
        venue,
        year,
        sections: selectedSections
      });
      onSuccess();
      onClose();
      // Reset form
      setCourse('');
      setDate(null);
      setTime('');
      setVenue('');
      setYear('');
      setSelectedSections([]);
    } catch (error) {
      console.error("Error adding exam:", error);
    }
  };

  const toggleSection = (sectionId) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId) 
        : [...prev, sectionId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
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
                {courses.map(c => (
                  <SelectItem key={c['Course Code']} value={c['Course Name']}>
                    {c['Course Name']} ({c['Course Code']})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exam Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
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
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="time" 
                  type="time" 
                  className="pl-9"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
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

            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="venue" 
                  placeholder="e.g. Hall A" 
                  className="pl-9"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Target Sections</Label>
            <div className="grid grid-cols-3 gap-4 border rounded-md p-4">
              {sections.map(section => (
                <div key={section} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`section-${section}`} 
                    checked={selectedSections.includes(section)}
                    onCheckedChange={() => toggleSection(section)}
                  />
                  <label 
                    htmlFor={`section-${section}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {section}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Complete Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExamModal;
