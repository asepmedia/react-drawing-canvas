import { useCallback, useEffect, useRef, useState } from "react";
import RdcDarkMode from "../icons/RdcDarkMode";
import Rdchand from "../icons/RdcHand";
import RdcLeftSidebar from "../icons/RdcLeftSidebar";
import RdcLightMode from "../icons/RdcLightMode";
import RdcPen from "../icons/RdcPen";
import RdcPointer from "../icons/RdcPointer";
import RdcRightSidebar from "../icons/RdcRightSidebar";
import "../styles/style.scss";
import cn from "../utils/cn";

const POINTER_TOOL = 1;
const PEN_TOOL = 2;
const HAND_TOOL = 3;
const tools: {
  name: number;
  icon: JSX.Element;
}[] = [
  {
    name: POINTER_TOOL,
    icon: <RdcPointer width={20} />,
  },
  {
    name: PEN_TOOL,
    icon: <RdcPen width={20} />,
  },
  {
    name: HAND_TOOL,
    icon: <Rdchand width={20} />,
  },
];

function Toolbar({
  selectedTool,
  setSelectedTool,
}: {
  selectedTool: number;
  setSelectedTool: (tool: number) => void;
}) {
  return (
    <>
      {tools.map((tool) => (
        <div
          role="button"
          className={cn("item", {
            active: selectedTool === tool.name,
          })}
          key={tool.name}
          onClick={() => setSelectedTool(tool.name)}
        >
          {tool.icon}
        </div>
      ))}
    </>
  );
}

interface DrawingProps {
  mode?: "light" | "dark";
}

interface Path {
  x: number;
  y: number;
  type: "rect" | "circle" | "line" | "text";
  meta: {
    color?: string;
    width?: number;
    height?: number;
  };
}

interface LinePath extends Path {
  points: { x: number; y: number }[];
}

export function Drawing(props: DrawingProps) {
  const { mode = "dark" } = props;
  const [isDarkMode, setIsDarkMode] = useState(mode === "dark");
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [paths, setPaths] = useState<Path[]>([]);
  const [selectedPathIndices, setSelectedPathIndices] = useState<number[]>([]);
  const [selectedTool, setSelectedTool] = useState(POINTER_TOOL);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (canvasRef?.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);

        if (selectedTool === POINTER_TOOL) {
          const foundIndices = paths.reduce((indices, path, index) => {
            if (path.type === "rect") {
              if (
                x >= path.x &&
                x <= path.x + (path.meta.width || 0) &&
                y >= path.y &&
                y <= path.y + (path.meta.height || 0)
              ) {
                indices.push(index);
              }
            } else if (path.type === "line") {
              const linePath = path as LinePath;
              for (let i = 0; i < linePath.points.length - 1; i++) {
                const p1 = linePath.points[i];
                const p2 = linePath.points[i + 1];
                const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const d1 = Math.hypot(p2.x - x, p2.y - y);
                const d2 = Math.hypot(p1.x - x, p1.y - y);
                if (d1 + d2 >= d - 1 && d1 + d2 <= d + 1) {
                  indices.push(index);
                  break;
                }
              }
            }
            return indices;
          }, [] as number[]);

          setSelectedPathIndices(foundIndices);
        }
      }
    },
    [canvasRef, paths, selectedTool]
  );

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (canvasRef?.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);

        if (selectedTool === PEN_TOOL) {
          setPaths((prevPaths) => [
            ...prevPaths,
            {
              x,
              y,
              type: "line",
              meta: { color: "#eaeaea" },
              points: [{ x, y }],
            } as LinePath,
          ]);
          setIsDrawing(true);
        } else if (selectedTool === HAND_TOOL) {
          setIsPanning(true);
          setPanStart({ x: event.clientX, y: event.clientY });
        } else if (selectedTool === POINTER_TOOL) {
          setSelectionStart({ x, y });
          setSelectionEnd({ x, y });
          setIsSelecting(true);
        }
      }
    },
    [selectedTool]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (canvasRef?.current) {
        if (isDrawing && selectedTool === PEN_TOOL) {
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const x = (event.clientX - rect.left) * (canvas.width / rect.width);
          const y = (event.clientY - rect.top) * (canvas.height / rect.height);

          setPaths((prevPaths) => {
            const newPaths = [...prevPaths];
            const currentPath = newPaths[newPaths.length - 1] as LinePath;
            currentPath.points.push({ x, y });
            return newPaths;
          });
        } else if (isPanning && selectedTool === HAND_TOOL) {
          const dx = event.clientX - panStart.x;
          const dy = event.clientY - panStart.y;

          setPanOffset((prevOffset) => ({
            x: prevOffset.x + dx,
            y: prevOffset.y + dy,
          }));

          setPanStart({ x: event.clientX, y: event.clientY });
        } else if (isSelecting && selectedTool === POINTER_TOOL) {
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const x = (event.clientX - rect.left) * (canvas.width / rect.width);
          const y = (event.clientY - rect.top) * (canvas.height / rect.height);

          setSelectionEnd({ x, y });
        }
      }
    },
    [isDrawing, selectedTool, panStart, isPanning, isSelecting]
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
    } else if (isPanning) {
      setIsPanning(false);
    } else if (isSelecting) {
      setIsSelecting(false);
      const selectionRect = {
        x1: Math.min(selectionStart.x, selectionEnd.x),
        y1: Math.min(selectionStart.y, selectionEnd.y),
        x2: Math.max(selectionStart.x, selectionEnd.x),
        y2: Math.max(selectionStart.y, selectionEnd.y),
      };

      const foundIndices = paths.reduce((indices, path, index) => {
        if (path.type === "rect") {
          const withinSelection =
            path.x >= selectionRect.x1 &&
            path.x + (path.meta.width || 0) <= selectionRect.x2 &&
            path.y >= selectionRect.y1 &&
            path.y + (path.meta.height || 0) <= selectionRect.y2;
          if (withinSelection) {
            indices.push(index);
          }
        } else if (path.type === "line") {
          const linePath = path as LinePath;
          const withinSelection = linePath.points.some(
            (point) =>
              point.x >= selectionRect.x1 &&
              point.x <= selectionRect.x2 &&
              point.y >= selectionRect.y1 &&
              point.y <= selectionRect.y2
          );
          if (withinSelection) {
            indices.push(index);
          }
        }
        return indices;
      }, [] as number[]);

      console.log(foundIndices);
      setSelectedPathIndices(foundIndices);
    }
  }, [isDrawing, isPanning, isSelecting, selectionStart, selectionEnd, paths]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (c) {
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.save();
      c.translate(panOffset.x, panOffset.y); // Apply the panning offset

      paths.forEach((path, index) => {
        switch (path.type) {
          case "rect":
            c.fillStyle = path.meta.color || "black";
            c.fillRect(
              path.x,
              path.y,
              path.meta.width || 0,
              path.meta.height || 0
            );
            if (selectedPathIndices.includes(index)) {
              c.strokeStyle = "#3b82f6";
              c.setLineDash([6, 6]);
              c.lineWidth = 2;
              c.strokeRect(
                path.x - 2,
                path.y - 2,
                (path.meta.width || 0) + 4,
                (path.meta.height || 0) + 4
              );
            }
            break;
          case "line":
            const linePath = path as LinePath;
            c.strokeStyle = path.meta.color || "black";
            c.lineWidth = 2;
            c.setLineDash([]);
            c.beginPath();
            c.moveTo(linePath.points[0].x, linePath.points[0].y);
            linePath.points.forEach((point) => {
              c.lineTo(point.x, point.y);
            });
            c.stroke();
            console.log("sds", selectedPathIndices);
            if (selectedPathIndices.includes(index)) {
              c.strokeStyle = "#3b82f6";
              c.setLineDash([6, 6]);
              c.lineWidth = 2;
              c.beginPath();
              c.moveTo(linePath.points[0].x, linePath.points[0].y);
              linePath.points.forEach((point) => {
                c.lineTo(point.x, point.y);
              });
              c.stroke();
            }
            break;
          default:
            break;
        }
      });

      if (isSelecting) {
        c.strokeStyle = "rgba(59, 130, 246, 0.5)";
        c.setLineDash([4, 4]);
        c.lineWidth = 1;
        c.strokeRect(
          selectionStart.x,
          selectionStart.y,
          selectionEnd.x - selectionStart.x,
          selectionEnd.y - selectionStart.y
        );
      }

      c.restore(); // Restore the context to prevent the offset from affecting other operations
    }
  }, [
    paths,
    selectedPathIndices,
    panOffset,
    isSelecting,
    selectionStart,
    selectionEnd,
  ]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = canvas.offsetWidth * dpr;
          canvas.height = canvas.offsetHeight * dpr;
          ctx.scale(dpr, dpr);
          draw(); // Redraw canvas on resize
        }
      }
    };

    handleResize(); // Initialize canvas size

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("click", handleClick);
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
      return () => {
        canvas.removeEventListener("click", handleClick);
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [handleClick, handleMouseDown, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    draw();

    return () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };
  }, [paths, selectedPathIndices, draw, panOffset]);

  return (
    <div
      className={cn("react_drawing_canvas", {
        light: !isDarkMode,
      })}
    >
      <div className="wrapper">
        <div className="topbar">
          <div
            role="button"
            className="toolbar"
            style={{
              width: "30%",
              height: "100%",
            }}
          >
            <Toolbar
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
            />
          </div>
          <div>
            <span className="muted"> Drafts</span> /{" "}
            <span className="bold"> Untitled</span>
          </div>
          <div
            style={{
              width: "30%",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <button
              className="button text"
              onClick={() => {
                setIsDarkMode((prev) => !prev);
              }}
            >
              {isDarkMode ? (
                <RdcLightMode width={20} />
              ) : (
                <div>
                  <RdcDarkMode width={20} />
                </div>
              )}
            </button>
            <button
              className="button text"
              onClick={() => {
                setShowLeftSidebar((prev) => !prev);
              }}
            >
              <RdcLeftSidebar width={20} />
            </button>
            <button
              className="button text"
              onClick={() => {
                setShowRightSidebar((prev) => !prev);
              }}
            >
              <RdcRightSidebar width={20} />
            </button>
            <button className="button">Save</button>
          </div>
        </div>
        <div className="editor">
          <div className="sidebar"></div>
          <div
            className="content"
            style={{
              padding: "20px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                border: "1px solid #aaa",
                width: "100%",
                height: "100%",
                cursor:
                  selectedTool === HAND_TOOL
                    ? "grab"
                    : selectedPathIndices.length > 0
                    ? "move"
                    : "default",
              }}
            ></canvas>
          </div>
          <div className="right sidebar"></div>
        </div>
      </div>
    </div>
  );
}
