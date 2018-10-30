module sorcerio.gameServer.point;

import sorcerio;

///
class Point {
	static double distance(Point a, Point b) {///
		import std.math;
		return sqrt( ((a.x - b.x)^^2) + ((a.y - b.y)^^2) );
	}

	double distance(Point b) {
		return Point.distance(this, b);
	}

	double x;
	double y;

	void moveTo(Point point) {
		moveTo(point.x, point.y);
	}

	void moveTo(double x, double y) {
		this.x = x;
		this.y = y;
	}

	///Moves the point `step` units towards `target`. NOTE: this can move the point past the target
	void moveTowards(Point target, double step) {
		double lenToTarget = distance(target);

		if (lenToTarget == 0.0 || step == 0.0) {
			return;
		}

		double dx = target.x - this.x;
		double dy = target.y - this.y;

		double stepLenRatio = step / lenToTarget;

		this.x += dx * stepLenRatio;
		this.y += dy * stepLenRatio;
	}

	unittest {
		Point initialPoint = new Point(1, 3);
		Point movingPoint = new Point(initialPoint.x, initialPoint.y);
		Point target = new Point(-1, 6.7);
		double step = 3.2;

		movingPoint.moveTowards(target, step);

		assert(initialPoint.distance(movingPoint) == step);
	}

	this(double x, double y) {
		this.x = x;
		this.y = y;
	}
}

private int randInt(int min, int max) {
	import std.random;
	Random generator = Random(unpredictableSeed);
	return uniform!"()"(min, max, generator);
}

///generates a random point between (0,0) and (`maxX`,`maxY`)
Point randomPoint(int maxX, int maxY) {
	return new Point(randInt(0, maxX), randInt(0, maxY));
}
