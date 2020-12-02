$.toaster({ settings : 
{
	'toaster'         :
	{
		'id'        : 'toaster',
		'container' : 'body',
		'template'  : '<div></div>',
		'class'     : 'toaster',
		'css'       :
		{
			'position' : 'fixed',
			'top'      : '10px',
			'left'    : '10px',
			'width'    : '450px',
			'zIndex'   : 50000
		}
	},
	
	'toast'       :
	{
		'template' :
		'<div class="alert alert-%priority% alert-dismissible" role="alert">' +
			'<button type="button" class="close" data-dismiss="alert">' +
				'<span aria-hidden="true">&times;</span>' +
				'<span class="sr-only">Close</span>' +
			'</button>' +
			'<span class="title"></span>: <span class="message"></span>' +
		'</div>',
	
		'css'      : {},
		'cssm'     : {},
		'csst'     : { 'fontWeight' : 'bold' },
	
		'fade'     : 'slow',
	},
	
	'debug'        : false,
	'timeout'      : 2500,
	'stylesheet'   : null,
	'donotdismiss' : []
}
});