from flask import Flask, render_template
from gee_utils import get_gee_map

app = Flask(__name__)

@app.route('/')
def index():
    # Get the GEE map object with tile URL and map ID
    map_info = get_gee_map()
    return render_template('index.html', map_info=map_info)

if __name__ == '__main__':
    app.run(debug=True)
