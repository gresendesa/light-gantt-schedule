class Tag {

	constructor({name, inner, attrs={}}={}){
		this.name = name
		this.inner = inner 
		this.attrs = attrs
	}

	stringifyAttrs() {
		var str_attrs = []
		this.attrs.forEach(function(attr){
			str_attrs.push(attr.content)
		})
		return str_attrs.join(' ')
	}

	get content(){
		return `<${this.name}${this.attrs.length ? ' '+this.stringifyAttrs() : ''}>${this.inner}</${this.name}>`
	}

};

Tag.Attribute = class {

	constructor({name, values}={}){
		this.name = name
		this.values = values
	}

	get content(){
		return `${this.name}="${this.values.join(' ')}"`
	}
}


class Schedule {

	constructor({data, config}={}){
		this.config = new Schedule.Config(config)
		this.groups = this.parseData(data)
		var timeBorders = this.getTimeBorders()
		this.timeBorderMax = timeBorders.max
		this.timeBorderMin = timeBorders.min
	}

	static get DAY_MS() {
		return 86400000;
	}

	parseData(data) {

		var groups = []

		data.forEach(function(group_data){

			var tasks = []

			var group = new Schedule.Group({'title': group_data.title, 'id': group_data.id, 'tasks': null, 'data': group_data})

			group_data.tasks.forEach(function(task){

				tasks.push(new Schedule.Task({'title': task.title, 'id': task.id, 'group': group, 'initial_date': task.initial_date, 'end_date': task.end_date, 'data': task}))

			})

			group.tasks = tasks

			groups.push(group)
			
		})

		return groups

	}

	getTimeBorders() {
		var min = Number.MAX_SAFE_INTEGER
		var max = 0
		var a = this

		this.groups.forEach(function(group){
			group.tasks.forEach(function(task){
				if(task.initial_date.getTime() < min)
					min = task.initial_date.getTime()
				if(task.end_date.getTime() > max)
					max = task.end_date.getTime()
			})
		})

		return {
			'min': min,
			'max': max,
		}
	}

 	get html_table() {
		return (new Schedule.HTMLTable({schedule: this})).html
	}

	start(){

		var schedule = this

		document.getElementById(schedule.config.container_id).innerHTML = schedule.html_table

		this.groups.forEach(function(group){
			var e = document.getElementById(`id-schedule-group-${group.id}`)
			if (e){
				e.addEventListener('click', function(){
					schedule.config.onclick.group_label(group)
				})
			}
			group.tasks.forEach(function(task){
				var e = document.getElementById(`id-schedule-task-${task.id}`)
				var d = document.getElementById(`id-schedule-time-${task.id}`)
				if (e){
					e.addEventListener('click', function(){
						schedule.config.onclick.task_label(task)
					})
				}
				if (d){
					d.addEventListener('click', function(){
						schedule.config.onclick.time_section(task)
					})
				}
			})
		})
	}

}

Schedule.Config = class {
	constructor({container_id, resolution, title, onclick, render}={}) {
		this.container_id = container_id
		this.resolution = resolution
		this.title = title
		this.onclick = new Schedule.Config.OnClick(onclick)
		this.render = new Schedule.Config.Render(render)
		console.log(render)
	}
}

Schedule.Config.OnClick = class {
	constructor({group_label=this.logonconsole, task_label=this.logonconsole, time_section=this.logonconsole}={}) {
		this.group_label = group_label
		this.task_label = task_label
		this.time_section = time_section
	}
	logonconsole(elem){
		console.log(elem)
	}
}

Schedule.Config.Render = class {
	constructor({group_label=this.group_label, task_label=this.task_label}={}) {
		this.group_label = group_label
		this.task_label = task_label
	}

	group_label(group){
		return group.title
	}

	task_label(task){
		return task.title
	}
}

Schedule.Task = class {

	constructor({title, id, group, initial_date, end_date, data}={}) {
		this.title = title
		this.id = id
		this.group = group
		this.data = data
		this.initial_date = new Date(initial_date)
		var temp_end_date = (new Date(end_date)).getTime()
		this.end_date = new Date(temp_end_date + Schedule.DAY_MS - 1);
	}
}

Schedule.Group = class {
	constructor({title, id, tasks, data}={}) {
		this.title = title
		this.id = id
		this.data = data
		this.tasks = tasks
	}
}

Schedule.HTMLTable = class {

	constructor({schedule}={}){
		this.schedule = schedule
		this.config
		this.section_time = (schedule.timeBorderMax - schedule.timeBorderMin) / schedule.config.resolution
	}

	tdSection({colspan, attrs=[]}={}){
		if(colspan){
			var colspan_attr = new Tag.Attribute({'name': 'colspan', 'values': [String(colspan)]})
			return (new Tag({'name': 'td', 'inner': '', 'attrs':[colspan_attr].concat(attrs)})).content
		} else {
			return ''
		}
	}

	simplify_date(date){

		return {
			'd': date.getUTCDate(),
			'm': date.getUTCMonth() + 1,
			'y': date.getUTCFullYear()
		}
	}

	htmlTimeCells(task){
		var td_tags = []
		var resolution = this.schedule.config.resolution
		var initial_date = task.initial_date.getTime()
		var end_date = task.end_date.getTime()

		var cspan_left = 0
		var cspan_time = 0

		for (var i = 1; i <= this.schedule.config.resolution; i++) {
			var level = this.schedule.timeBorderMin + i * this.section_time
			if ((level > initial_date) &&
				(level <= end_date)){
				cspan_left = (cspan_left == 0) ? i : cspan_left 
				cspan_time++
			}
		}

		var i = this.simplify_date(task.initial_date)
		var e = this.simplify_date(task.end_date)

		var duration_days = Math.ceil((task.end_date - task.initial_date)/Schedule.DAY_MS)
		var dt = new Tag.Attribute({'name': 'data-toggle', 'values': ['tooltip']})
		var dh = new Tag.Attribute({'name': 'data-html', 'values': ['true']})
		var tt = new Tag.Attribute({'name': 'title', 'values': [`${duration_days} dia${duration_days > 1 ? 's' : ''}, de <b>${i.d}/${i.m}/${i.y.toString().substr(-2)}</b> a <b>${e.d}/${e.m}/${e.y.toString().substr(-2)}</b>`]})
		var tb = new Tag.Attribute({'name': 'data-container', 'values': ['body']})
		var class_attr = new Tag.Attribute({'name': 'class', 'values': ['schedule-intime', 'test', 'schedule-clickable']})
		var d = new Tag.Attribute({'name': 'id', 'values': [`id-schedule-time-${task.id}`]})
		var td_time = this.tdSection({'colspan': cspan_time, 'attrs': [class_attr, d, dt, dh, tt, tb]})

		cspan_left -= 1
		var class_attr = new Tag.Attribute({'name': 'class', 'values': ['schedule-outtime']})
		var td_left = this.tdSection({'colspan': cspan_left, 'attrs': [class_attr]})

		var cspan_right = this.schedule.config.resolution - (cspan_left + cspan_time)
		var td_right = this.tdSection({'colspan': cspan_right, 'attrs': [class_attr]})

		return [td_left, td_time, td_right]
	}

	get html(){
		var a = this
		var trs = []

		var i = this.simplify_date(new Date(this.schedule.timeBorderMin))
		var e = this.simplify_date(new Date(this.schedule.timeBorderMax))

		var duration_days = Math.ceil((this.schedule.timeBorderMax - this.schedule.timeBorderMin)/Schedule.DAY_MS)
		var content = `Período de ${i.d}/${i.m}/${i.y.toString().substr(-2)} a ${e.d}/${e.m}/${e.y.toString().substr(-2)} (${duration_days} dia${(duration_days > 1) ? 's' : ''})`

		var first_td = (new Tag({'name': 'td', 'inner': (this.schedule.timeBorderMax) ? content : ''})).content
		var scale_tds = []

		for (var i = 0; i < this.schedule.config.resolution; i++) {
			scale_tds.push((new Tag({'name': 'td', 'inner': ' '})).content)
		}

		var c = new Tag.Attribute({'name': 'class', 'values': ['colspanreference']})
		var first_tr = (new Tag({'name': 'tr', 'inner': first_td + scale_tds.join(''), 'attrs': [c]})).content
		var trs = [first_tr]

		var ck = new Tag.Attribute({'name': 'class', 'values': ['schedule-clickable']})

		this.schedule.groups.forEach(function(group){

			var c = new Tag.Attribute({'name': 'class', 'values': ['schedule-group-label']})
			var d = new Tag.Attribute({'name': 'id', 'values': [`id-schedule-group-${group.id}`]})
			var span_group_label = (new Tag({'name': 'span', 'inner': a.schedule.config.render.group_label(group), 'attrs': [d, ck]})).content
			var b_group_label = (new Tag({'name': 'b', 'inner': span_group_label})).content

			var group_label_td = (new Tag({'name': 'td', 'inner': b_group_label, 'attrs': [c]})).content
			var group_right_line = a.tdSection({'colspan': a.schedule.config.resolution, 'attrs': [c]})

			var group_label_tr = (new Tag({'name': 'tr', 'inner': group_label_td + group_right_line})).content

			trs.push(group_label_tr)
			group.tasks.forEach(function(task){

				var c = new Tag.Attribute({'name': 'class', 'values': ['schedule-label']})
				var d = new Tag.Attribute({'name': 'id', 'values': [`id-schedule-task-${task.id}`]})
				var span_task_label = (new Tag({'name': 'span', 'inner': a.schedule.config.render.task_label(task), 'attrs': [d, ck]})).content

				var tag = new Tag({'name': 'td', 'inner': span_task_label, 'attrs': [c]})
				var tags = a.htmlTimeCells(task)
				tags.unshift(tag.content)
				trs.push((new Tag({'name': 'tr', 'inner': tags.join('')})).content)

			})
		})

		var c = new Tag.Attribute({'name': 'class', 'values': ['schedule']})
		return (new Tag({'name': 'table', 'inner': trs.join('\n'), 'attrs':[c]})).content
	}	

}