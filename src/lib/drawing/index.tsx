import "../styles/style.scss";

export function Drawing() {
  return (
    <div className="react_drawing_canvas">
      <div className="wrapper">
        <div className="topbar">
          {/* <button className="button">Clear</button> */}
          <div>sds</div>
          <div>
            <span className="muted"> Drafts</span> / <span> Untitled</span>
          </div>
          <div>
            <button className="button">Save</button>
          </div>
        </div>
        <div className="editor">
          <div className="sidebar"></div>
          <div className="content">
            <div>sdss</div>
          </div>
          <div className="sidebar right"></div>
        </div>
      </div>
    </div>
  );
}
